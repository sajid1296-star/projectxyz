import { Redis } from 'ioredis'
import { prisma } from '../prisma'
import { LoggerService } from '../logger'
import { NotificationService } from '../notifications'
import { QueueService } from '../queue'
import * as Sentry from '@sentry/node'
import { Severity } from '@sentry/types'
import { OpenAI } from 'openai'
import { Prometheus } from '@opentelemetry/metrics'

const logger = new LoggerService()
const notifications = new NotificationService()
const queue = new QueueService()
const redis = new Redis(process.env.REDIS_URL!)

// Sentry für Error Tracking
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 1.0
})

// OpenAI für Error Analysis
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

// Prometheus für Error Metrics
const prometheus = new Prometheus({
  port: 9090,
  endpoint: '/metrics'
})

export class ErrorService {
  async handleError(error: any, context: {
    type: string
    severity: Severity
    user?: any
    metadata?: any
    source?: string
    request?: Request
  }) {
    try {
      const {
        type,
        severity,
        user,
        metadata,
        source,
        request
      } = context

      // Error normalisieren
      const normalizedError = this.normalizeError(error)

      // In DB speichern
      const errorRecord = await prisma.error.create({
        data: {
          type,
          message: normalizedError.message,
          stack: normalizedError.stack,
          metadata: {
            ...metadata,
            source,
            userId: user?.id
          },
          severity,
          timestamp: new Date()
        }
      })

      // Sentry melden
      Sentry.captureException(error, {
        level: severity,
        user,
        extra: metadata,
        tags: {
          type,
          source
        }
      })

      // Prometheus Metrics
      prometheus.counter({
        name: `error_${type}`,
        value: 1,
        labels: {
          severity,
          source: source || 'unknown'
        }
      })

      // Error Pattern Analysis
      await this.analyzeErrorPattern(errorRecord)

      // Benachrichtigungen
      if (severity === 'fatal' || severity === 'error') {
        await this.sendErrorNotifications(errorRecord)
      }

      // Error Recovery
      await this.attemptErrorRecovery(errorRecord)

      return errorRecord
    } catch (handlingError) {
      logger.log('error', 'Error handling failed', {
        originalError: error,
        handlingError
      })
      throw handlingError
    }
  }

  async getErrorStats(options: {
    startDate: Date
    endDate: Date
    type?: string
    severity?: Severity
    source?: string
  }) {
    try {
      const {
        startDate,
        endDate,
        type,
        severity,
        source
      } = options

      // Cache-Key
      const cacheKey = `error_stats:${JSON.stringify(options)}`
      
      // Cache prüfen
      const cached = await redis.get(cacheKey)
      if (cached) return JSON.parse(cached)

      // Stats aus DB holen
      const stats = await prisma.error.groupBy({
        by: ['type', 'severity', 'source'],
        where: {
          timestamp: {
            gte: startDate,
            lte: endDate
          },
          type: type,
          severity: severity,
          metadata: source ? {
            path: ['source'],
            equals: source
          } : undefined
        },
        _count: true,
        _min: {
          timestamp: true
        },
        _max: {
          timestamp: true
        }
      })

      // Cache setzen (5 Minuten)
      await redis.set(
        cacheKey,
        JSON.stringify(stats),
        'EX',
        300
      )

      return stats
    } catch (error) {
      logger.log('error', 'Error stats failed', { error })
      throw error
    }
  }

  async analyzeErrors(options: {
    timeframe: string
    type?: string
  }) {
    try {
      const { timeframe, type } = options

      // Errors laden
      const errors = await prisma.error.findMany({
        where: {
          type,
          timestamp: {
            gte: new Date(
              Date.now() - this.parseTimeframe(timeframe)
            )
          }
        },
        orderBy: {
          timestamp: 'desc'
        }
      })

      // KI-Analyse durchführen
      const analysis = await this.performAIAnalysis(errors)

      // Patterns identifizieren
      const patterns = this.identifyErrorPatterns(errors)

      // Recommendations generieren
      const recommendations = await this.generateRecommendations(
        patterns
      )

      return {
        errors,
        analysis,
        patterns,
        recommendations
      }
    } catch (error) {
      logger.log('error', 'Error analysis failed', { error })
      throw error
    }
  }

  private normalizeError(error: any) {
    return {
      message: error.message || 'Unknown error',
      stack: error.stack || new Error().stack,
      code: error.code,
      name: error.name || 'Error'
    }
  }

  private async analyzeErrorPattern(error: any) {
    // Pattern Analysis durchführen
    const pattern = await redis.incr(
      `error_pattern:${error.type}:${error.message}`
    )

    if (pattern > 10) {
      await this.triggerErrorAlert(error)
    }
  }

  private async sendErrorNotifications(error: any) {
    await notifications.send({
      type: 'ERROR_ALERT',
      severity: error.severity,
      data: {
        type: error.type,
        message: error.message,
        metadata: error.metadata
      }
    })
  }

  private async attemptErrorRecovery(error: any) {
    // Recovery-Strategien implementieren
    switch (error.type) {
      case 'DATABASE_CONNECTION':
        await this.recoverDatabaseConnection()
        break
      case 'API_TIMEOUT':
        await this.retryFailedRequest(error)
        break
      // Weitere Recovery-Strategien...
    }
  }

  private async performAIAnalysis(errors: any[]) {
    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [{
        role: 'system',
        content: 'Analyze these error patterns and suggest solutions.'
      }, {
        role: 'user',
        content: JSON.stringify(errors)
      }]
    })

    return response.choices[0].message.content
  }

  private identifyErrorPatterns(errors: any[]) {
    // Pattern-Erkennung implementieren
    return []
  }

  private async generateRecommendations(patterns: any[]) {
    // Recommendations generieren
    return []
  }

  private parseTimeframe(timeframe: string): number {
    const units: Record<string, number> = {
      h: 3600000,
      d: 86400000,
      w: 604800000
    }
    const [, num, unit] = timeframe.match(/(\d+)([hdw])/) || []
    return parseInt(num) * (units[unit] || units.h)
  }

  private async recoverDatabaseConnection() {
    // DB-Recovery implementieren
  }

  private async retryFailedRequest(error: any) {
    // Request-Retry implementieren
  }

  private async triggerErrorAlert(error: any) {
    // Alert triggern
  }
} 