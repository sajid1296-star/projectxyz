import { prisma } from '../prisma'
import { Redis } from 'ioredis'
import { Prometheus } from '@opentelemetry/metrics'
import { NewRelic } from 'newrelic'
import { captureException } from '@sentry/node'
import { LoggerService } from '../logger'
import { QueueService } from '../queue'
import { NotificationService } from '../notifications'
import { OpenTelemetry } from '@opentelemetry/sdk-node'
import { DataDog } from '@datadog/datadog-api-client'
import { Grafana } from '@grafana/runtime'
import { HealthCheck } from '@godaddy/terminus'

const logger = new LoggerService()
const queue = new QueueService()
const notifications = new NotificationService()
const redis = new Redis(process.env.REDIS_URL!)

// Monitoring Providers
const opentelemetry = new OpenTelemetry()
const prometheus = new Prometheus()
const datadog = new DataDog()
const newrelic = new NewRelic()
const grafana = new Grafana()

export class MonitoringService {
  private checks: Map<string, () => Promise<boolean>>

  constructor() {
    this.checks = new Map()
    this.initializeChecks()
    this.startMonitoring()
  }

  async check(service: string) {
    try {
      const check = this.checks.get(service)
      if (!check) throw new Error(`Unknown service: ${service}`)

      const start = Date.now()
      const healthy = await check()
      const duration = Date.now() - start

      await this.recordMetrics(service, healthy, duration)

      if (!healthy) {
        await this.handleUnhealthy(service)
      }

      return {
        healthy,
        duration,
        timestamp: new Date()
      }
    } catch (error) {
      logger.log('error', 'Health check failed', { error })
      return { healthy: false }
    }
  }

  async getStatus() {
    const results = await Promise.all(
      Array.from(this.checks.keys()).map(service =>
        this.check(service)
      )
    )

    const status = {
      healthy: results.every(r => r.healthy),
      services: Object.fromEntries(
        Array.from(this.checks.keys()).map((service, i) => [
          service,
          results[i]
        ])
      ),
      timestamp: new Date()
    }

    await redis.set('system:status', JSON.stringify(status))
    return status
  }

  private initializeChecks() {
    // Database
    this.checks.set('database', async () => {
      try {
        await prisma.$queryRaw`SELECT 1`
        return true
      } catch {
        return false
      }
    })

    // Redis
    this.checks.set('redis', async () => {
      try {
        await redis.ping()
        return true
      } catch {
        return false
      }
    })

    // Queue
    this.checks.set('queue', async () => {
      try {
        await queue.getStatus()
        return true
      } catch {
        return false
      }
    })

    // External APIs
    this.checks.set('api', async () => {
      try {
        const response = await fetch(process.env.API_URL + '/health')
        return response.ok
      } catch {
        return false
      }
    })
  }

  private async startMonitoring() {
    setInterval(async () => {
      const status = await this.getStatus()
      await this.exportMetrics(status)
    }, 60000) // Jede Minute
  }

  private async recordMetrics(
    service: string,
    healthy: boolean,
    duration: number
  ) {
    // Prometheus
    prometheus.recordMetric('health_check', {
      service,
      healthy: healthy.toString(),
      duration
    })

    // DataDog
    datadog.metrics.submit([{
      metric: 'health_check',
      points: [[Date.now(), duration]],
      tags: [`service:${service}`, `healthy:${healthy}`]
    }])

    // NewRelic
    newrelic.recordMetric(`health_check_${service}`, duration)
  }

  private async exportMetrics(status: any) {
    // OpenTelemetry
    opentelemetry.exportMetrics(status)

    // Grafana
    grafana.pushMetrics({
      name: 'system_health',
      value: status.healthy ? 1 : 0,
      timestamp: status.timestamp
    })
  }

  private async handleUnhealthy(service: string) {
    // Alert senden
    await notifications.send({
      type: 'HEALTH_ALERT',
      recipients: [{
        id: 'ops-team',
        channels: ['slack', 'email']
      }],
      template: 'health_alert',
      data: { service }
    })

    // Recovery Job
    await queue.addJob('service_recovery', {
      service,
      timestamp: new Date()
    })
  }

  async trackPerformance(metric: {
    name: string
    value: number
    path: string
    device?: string
    connection?: string
    userAgent?: string
  }) {
    // Speichere in DB
    await prisma.performanceMetric.create({
      data: metric
    })

    // Sende an Prometheus
    prometheus.recordMetric(
      `web_vitals_${metric.name.toLowerCase()}`,
      metric.value
    )

    // Sende an New Relic
    newrelic.recordMetric(
      `WebVitals/${metric.name}`,
      metric.value
    )

    // Aktualisiere Durchschnitte im Cache
    const key = `perf:${metric.name}:${metric.path}`
    await redis.zadd(key, Date.now(), metric.value)
    await redis.zremrangebyrank(key, 0, -1001) // Behalte letzte 1000
  }

  async trackError(error: {
    type: string
    message: string
    stack?: string
    path?: string
    userId?: string
    metadata?: any
  }) {
    // Speichere in DB
    await prisma.errorLog.create({
      data: error
    })

    // Sende an Sentry
    captureException(new Error(error.message), {
      tags: {
        type: error.type,
        path: error.path
      },
      user: error.userId ? { id: error.userId } : undefined,
      extra: error.metadata
    })

    // Aktualisiere Error-Rate Metriken
    const key = `errors:${error.type}:${new Date().toISOString().slice(0, 13)}`
    await redis.incr(key)
  }

  async trackAPIMetrics(metric: {
    path: string
    method: string
    statusCode: number
    duration: number
  }) {
    // Speichere in DB
    await prisma.aPIMetric.create({
      data: metric
    })

    // Sende an Prometheus
    prometheus.recordMetric('api_request_duration', metric.duration, {
      path: metric.path,
      method: metric.method,
      status: metric.statusCode.toString()
    })

    // Cache für Echtzeit-Monitoring
    const key = `api:${metric.path}:${metric.method}`
    await redis.lpush(key, JSON.stringify({
      ...metric,
      timestamp: Date.now()
    }))
    await redis.ltrim(key, 0, 999) // Behalte letzte 1000
  }

  async getPerformanceStats(
    metric: string,
    path?: string,
    timeframe: string = '24h'
  ) {
    const key = `perf:${metric}:${path || '*'}`
    const now = Date.now()
    const start = now - this.getTimeframeMs(timeframe)

    const values = await redis.zrangebyscore(
      key,
      start,
      now,
      'WITHSCORES'
    )

    return this.calculateStats(values)
  }

  private calculateStats(values: string[]) {
    const numbers = values.map(v => parseFloat(v))
    return {
      avg: numbers.reduce((a, b) => a + b, 0) / numbers.length,
      p75: this.percentile(numbers, 75),
      p95: this.percentile(numbers, 95),
      p99: this.percentile(numbers, 99)
    }
  }

  private percentile(arr: number[], p: number) {
    const sorted = arr.sort((a, b) => a - b)
    const pos = (sorted.length - 1) * p / 100
    const base = Math.floor(pos)
    const rest = pos - base
    if (sorted[base + 1] !== undefined) {
      return sorted[base] + rest * (sorted[base + 1] - sorted[base])
    } else {
      return sorted[base]
    }
  }

  private getTimeframeMs(timeframe: string): number {
    const units: Record<string, number> = {
      h: 3600000,
      d: 86400000,
      w: 604800000
    }
    const [, num, unit] = timeframe.match(/(\d+)([hdw])/) || []
    return parseInt(num) * (units[unit] || units.h)
  }
} 