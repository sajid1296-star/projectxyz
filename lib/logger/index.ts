import winston from 'winston'
import { ElasticsearchTransport } from 'winston-elasticsearch'
import { Redis } from 'ioredis'
import { Logtail } from '@logtail/node'
import { prisma } from '../prisma'

const redis = new Redis(process.env.REDIS_URL!)
const logtail = new Logtail(process.env.LOGTAIL_TOKEN!)

// Winston Konfiguration
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json(),
    winston.format.errors({ stack: true })
  ),
  defaultMeta: {
    service: process.env.SERVICE_NAME || 'web',
    environment: process.env.NODE_ENV
  },
  transports: [
    // Elasticsearch für Suche und Visualisierung
    new ElasticsearchTransport({
      level: 'info',
      clientOpts: {
        node: process.env.ELASTICSEARCH_URL,
        auth: {
          username: process.env.ELASTICSEARCH_USER!,
          password: process.env.ELASTICSEARCH_PASS!
        }
      },
      indexPrefix: 'logs'
    }),
    // Logtail für Echtzeit-Monitoring
    {
      log: (info, callback) => {
        logtail.log(info).then(callback)
      }
    } as any,
    // Lokale Logs im Development
    process.env.NODE_ENV !== 'production' && new winston.transports.Console({
      format: winston.format.prettyPrint()
    })
  ].filter(Boolean)
})

export class LoggerService {
  async log(
    level: string,
    message: string,
    metadata: any = {}
  ) {
    // Basis-Logging
    logger.log(level, message, metadata)

    // Kritische Fehler in DB speichern
    if (level === 'error') {
      await prisma.errorLog.create({
        data: {
          message,
          metadata,
          timestamp: new Date()
        }
      })
    }

    // Echtzeit-Metriken aktualisieren
    const key = `logs:${level}:${new Date().toISOString().slice(0, 13)}`
    await redis.incr(key)
  }

  async query(options: {
    level?: string
    from?: Date
    to?: Date
    search?: string
    limit?: number
  } = {}) {
    const { level, from, to, search, limit = 100 } = options

    // Elasticsearch-Suche
    const response = await fetch(
      `${process.env.ELASTICSEARCH_URL}/logs/_search`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Basic ${Buffer.from(
            `${process.env.ELASTICSEARCH_USER}:${process.env.ELASTICSEARCH_PASS}`
          ).toString('base64')}`
        },
        body: JSON.stringify({
          query: {
            bool: {
              must: [
                level && { match: { level } },
                search && { 
                  multi_match: {
                    query: search,
                    fields: ['message', 'metadata.*']
                  }
                },
                from && to && {
                  range: {
                    timestamp: {
                      gte: from.toISOString(),
                      lte: to.toISOString()
                    }
                  }
                }
              ].filter(Boolean)
            }
          },
          size: limit,
          sort: [{ timestamp: 'desc' }]
        })
      }
    )

    return response.json()
  }

  async getMetrics(timeframe: string = '24h') {
    const now = new Date()
    const start = new Date(now.getTime() - this.parseTimeframe(timeframe))

    // Aggregiere Log-Level-Verteilung
    const levels = await Promise.all(
      ['error', 'warn', 'info', 'debug'].map(async level => {
        const count = await this.countLogs(level, start, now)
        return { level, count }
      })
    )

    return {
      total: levels.reduce((sum, { count }) => sum + count, 0),
      levels,
      topErrors: await this.getTopErrors(start, now)
    }
  }

  private async countLogs(
    level: string,
    start: Date,
    end: Date
  ): Promise<number> {
    const keys = await redis.keys(
      `logs:${level}:${start.toISOString().slice(0, 13)}*`
    )
    const counts = await Promise.all(
      keys.map(key => redis.get(key))
    )
    return counts
      .map(count => parseInt(count || '0'))
      .reduce((a, b) => a + b, 0)
  }

  private async getTopErrors(
    start: Date,
    end: Date
  ) {
    return prisma.errorLog.groupBy({
      by: ['message'],
      _count: true,
      where: {
        timestamp: {
          gte: start,
          lte: end
        }
      },
      orderBy: {
        _count: {
          message: 'desc'
        }
      },
      take: 10
    })
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
} 