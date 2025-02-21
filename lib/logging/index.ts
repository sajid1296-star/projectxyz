import { Redis } from 'ioredis'
import { prisma } from '../prisma'
import { QueueService } from '../queue'
import { createWriteStream } from 'fs'
import { S3 } from 'aws-sdk'
import { Elasticsearch } from '@elastic/elasticsearch'
import { DataDog } from '@datadog/datadog-api-client'
import { Sentry } from '@sentry/node'
import { OpenTelemetry } from '@opentelemetry/sdk-node'
import { gzip } from 'zlib'
import { promisify } from 'util'
import { format } from 'winston'

const queue = new QueueService()
const redis = new Redis(process.env.REDIS_URL!)
const gzipAsync = promisify(gzip)

// Log Destinations
const s3 = new S3({ region: process.env.AWS_REGION })
const elasticsearch = new Elasticsearch({
  node: process.env.ELASTICSEARCH_URL
})
const datadog = new DataDog()
const opentelemetry = new OpenTelemetry()

// Log Levels
const LOG_LEVELS = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  verbose: 4,
  debug: 5,
  silly: 6
}

export class LoggingService {
  private stream: any
  private buffer: any[] = []
  private flushInterval: NodeJS.Timeout

  constructor() {
    // Rotating File Stream
    this.stream = createWriteStream(
      `logs/${new Date().toISOString().split('T')[0]}.log`,
      { flags: 'a' }
    )

    // Buffer Flush Interval
    this.flushInterval = setInterval(
      () => this.flushBuffer(),
      5000 // 5 Sekunden
    )
  }

  async log(
    level: keyof typeof LOG_LEVELS,
    message: string,
    metadata: any = {}
  ) {
    try {
      const timestamp = new Date()
      const logEntry = {
        level,
        message,
        metadata: this.sanitizeMetadata(metadata),
        timestamp,
        environment: process.env.NODE_ENV,
        service: process.env.SERVICE_NAME,
        trace_id: opentelemetry.getCurrentSpan()?.spanContext().traceId
      }

      // Log Buffer
      this.buffer.push(logEntry)

      // Real-time Processing
      await this.processRealTimeLog(logEntry)

      // Error Tracking
      if (level === 'error') {
        await this.handleErrorLog(logEntry)
      }

      // Buffer Flush Check
      if (this.buffer.length >= 100) {
        await this.flushBuffer()
      }

      return logEntry
    } catch (error) {
      console.error('Logging failed:', error)
      throw error
    }
  }

  async query(options: {
    startDate: Date
    endDate: Date
    level?: string
    search?: string
    limit?: number
    offset?: number
    sort?: 'asc' | 'desc'
  }) {
    try {
      const {
        startDate,
        endDate,
        level,
        search,
        limit = 100,
        offset = 0,
        sort = 'desc'
      } = options

      // Elasticsearch Query
      const { body } = await elasticsearch.search({
        index: 'logs',
        body: {
          query: {
            bool: {
              must: [
                {
                  range: {
                    timestamp: {
                      gte: startDate.toISOString(),
                      lte: endDate.toISOString()
                    }
                  }
                },
                level && {
                  term: { level }
                },
                search && {
                  multi_match: {
                    query: search,
                    fields: ['message', 'metadata.*']
                  }
                }
              ].filter(Boolean)
            }
          },
          sort: [
            { timestamp: sort }
          ],
          size: limit,
          from: offset
        }
      })

      return body.hits.hits.map((hit: any) => ({
        ...hit._source,
        score: hit._score
      }))
    } catch (error) {
      console.error('Log query failed:', error)
      throw error
    }
  }

  async aggregate(options: {
    startDate: Date
    endDate: Date
    groupBy: string
    metric: string
  }) {
    try {
      const {
        startDate,
        endDate,
        groupBy,
        metric
      } = options

      // Elasticsearch Aggregation
      const { body } = await elasticsearch.search({
        index: 'logs',
        body: {
          query: {
            range: {
              timestamp: {
                gte: startDate.toISOString(),
                lte: endDate.toISOString()
              }
            }
          },
          aggs: {
            results: {
              terms: {
                field: groupBy,
                size: 10
              },
              aggs: {
                metric: {
                  [metric]: { field: 'value' }
                }
              }
            }
          },
          size: 0
        }
      })

      return body.aggregations.results.buckets
    } catch (error) {
      console.error('Log aggregation failed:', error)
      throw error
    }
  }

  private async flushBuffer() {
    if (this.buffer.length === 0) return

    const logs = [...this.buffer]
    this.buffer = []

    try {
      // Batch Processing
      await Promise.all([
        // File System
        this.writeToFile(logs),
        // Elasticsearch
        this.writeToElasticsearch(logs),
        // S3
        this.writeToS3(logs),
        // DataDog
        this.writeToDataDog(logs)
      ])
    } catch (error) {
      console.error('Log flush failed:', error)
      // Logs zurück in Buffer
      this.buffer = [...logs, ...this.buffer]
    }
  }

  private async processRealTimeLog(log: any) {
    // Real-time Metriken
    await redis.hincrby(
      `logs:${log.level}`,
      new Date().toISOString().split('T')[0],
      1
    )

    // Alert Checks
    if (this.shouldAlert(log)) {
      await queue.addJob('log_alert', {
        level: log.level,
        message: log.message,
        metadata: log.metadata
      })
    }
  }

  private async handleErrorLog(log: any) {
    // Sentry
    Sentry.captureException(log.metadata.error || log.message, {
      level: 'error',
      extra: log.metadata
    })

    // Error Tracking in DB
    await prisma.errorLog.create({
      data: {
        message: log.message,
        metadata: log.metadata,
        timestamp: log.timestamp
      }
    })
  }

  private shouldAlert(log: any): boolean {
    // Alert Logik implementieren
    return false
  }

  private sanitizeMetadata(metadata: any): any {
    // Sensitive Daten entfernen
    const sanitized = { ...metadata }
    delete sanitized.password
    delete sanitized.token
    delete sanitized.secret
    return sanitized
  }

  private async writeToFile(logs: any[]) {
    const formatted = logs
      .map(log => JSON.stringify(log))
      .join('\n')
    this.stream.write(formatted + '\n')
  }

  private async writeToElasticsearch(logs: any[]) {
    const body = logs.flatMap(log => [
      { index: { _index: 'logs' } },
      log
    ])
    await elasticsearch.bulk({ body })
  }

  private async writeToS3(logs: any[]) {
    const compressed = await gzipAsync(
      JSON.stringify(logs)
    )
    await s3.putObject({
      Bucket: 'logs',
      Key: `${new Date().toISOString()}.json.gz`,
      Body: compressed
    }).promise()
  }

  private async writeToDataDog(logs: any[]) {
    await datadog.logs.submit(
      logs.map(log => ({
        message: log.message,
        level: log.level,
        timestamp: log.timestamp,
        metadata: log.metadata
      }))
    )
  }
} 