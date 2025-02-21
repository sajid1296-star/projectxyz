import { Redis } from 'ioredis'
import { prisma } from '../prisma'
import { LoggerService } from '../logger'
import { PerformanceService } from '../performance'
import { QueueService } from '../queue'
import { createHash } from 'crypto'
import { Memcached } from 'memcached'
import { S3 } from 'aws-sdk'
import { gzip, ungzip } from 'zlib'
import { promisify } from 'util'

const logger = new LoggerService()
const performance = new PerformanceService()
const queue = new QueueService()

// Compression
const gzipAsync = promisify(gzip)
const ungzipAsync = promisify(ungzip)

// Cache Providers
const redis = new Redis(process.env.REDIS_URL!)
const memcached = new Memcached(process.env.MEMCACHED_URL!)
const s3 = new S3({
  region: process.env.AWS_REGION
})

export class CacheService {
  async get<T>(key: string, options: {
    type?: 'memory' | 'redis' | 'memcached' | 's3'
    compress?: boolean
    fallback?: () => Promise<T>
    ttl?: number
    namespace?: string
    tags?: string[]
  } = {}): Promise<T | null> {
    try {
      const {
        type = 'redis',
        compress = false,
        fallback,
        ttl = 3600,
        namespace,
        tags = []
      } = options

      // Cache-Key generieren
      const cacheKey = this.generateCacheKey(key, namespace)

      // Performance-Tracking
      const { span } = await performance.startSpan({
        name: 'cache_get',
        type: 'cache',
        metadata: { key: cacheKey, type }
      })

      // Cache prüfen
      let data = await this.getFromCache(cacheKey, type)

      // Cache Miss
      if (!data && fallback) {
        // Fallback ausführen
        data = await fallback()

        // In Cache speichern
        await this.set(key, data, {
          type,
          compress,
          ttl,
          namespace,
          tags
        })

        // Metric tracken
        await performance.trackMetric({
          name: 'cache_miss',
          value: 1,
          type: 'counter',
          labels: { namespace }
        })
      } else {
        // Cache Hit
        await performance.trackMetric({
          name: 'cache_hit',
          value: 1,
          type: 'counter',
          labels: { namespace }
        })
      }

      // Wenn komprimiert, dekomprimieren
      if (compress && data) {
        data = await this.decompress(data)
      }

      span.end({ hit: !!data })

      return data as T
    } catch (error) {
      logger.log('error', 'Cache get failed', { error })
      throw error
    }
  }

  async set(key: string, data: any, options: {
    type?: 'memory' | 'redis' | 'memcached' | 's3'
    compress?: boolean
    ttl?: number
    namespace?: string
    tags?: string[]
  } = {}) {
    try {
      const {
        type = 'redis',
        compress = false,
        ttl = 3600,
        namespace,
        tags = []
      } = options

      // Cache-Key generieren
      const cacheKey = this.generateCacheKey(key, namespace)

      // Wenn komprimieren, dann komprimieren
      let valueToStore = data
      if (compress) {
        valueToStore = await this.compress(data)
      }

      // In Cache speichern
      await this.storeInCache(
        cacheKey,
        valueToStore,
        type,
        ttl
      )

      // Tags speichern
      if (tags.length > 0) {
        await this.storeTags(cacheKey, tags)
      }

      // Cache-Eintrag in DB loggen
      await prisma.cacheEntry.create({
        data: {
          key: cacheKey,
          type,
          ttl,
          tags,
          createdAt: new Date()
        }
      })
    } catch (error) {
      logger.log('error', 'Cache set failed', { error })
      throw error
    }
  }

  async invalidate(options: {
    key?: string
    namespace?: string
    tags?: string[]
    type?: 'memory' | 'redis' | 'memcached' | 's3'
  }) {
    try {
      const {
        key,
        namespace,
        tags,
        type = 'redis'
      } = options

      if (key) {
        // Einzelnen Key invalidieren
        const cacheKey = this.generateCacheKey(key, namespace)
        await this.removeFromCache(cacheKey, type)
      } else if (tags) {
        // Nach Tags invalidieren
        const keys = await this.getKeysByTags(tags)
        await Promise.all(
          keys.map(k => this.removeFromCache(k, type))
        )
      } else if (namespace) {
        // Namespace invalidieren
        const pattern = `cache:${namespace}:*`
        await this.removeByPattern(pattern, type)
      }

      // Invalidierung loggen
      await prisma.cacheInvalidation.create({
        data: {
          key,
          namespace,
          tags,
          type,
          timestamp: new Date()
        }
      })
    } catch (error) {
      logger.log('error', 'Cache invalidation failed', { error })
      throw error
    }
  }

  async warmup(options: {
    keys: string[]
    type?: 'memory' | 'redis' | 'memcached' | 's3'
    parallel?: boolean
  }) {
    try {
      const {
        keys,
        type = 'redis',
        parallel = true
      } = options

      // Warmup-Jobs erstellen
      const jobs = keys.map(key => ({
        key,
        type,
        timestamp: new Date()
      }))

      if (parallel) {
        // Parallel ausführen
        await Promise.all(
          jobs.map(job => queue.addJob('cache_warmup', job))
        )
      } else {
        // Sequentiell ausführen
        for (const job of jobs) {
          await queue.addJob('cache_warmup', job)
        }
      }

      // Warmup loggen
      await prisma.cacheWarmup.createMany({
        data: jobs
      })
    } catch (error) {
      logger.log('error', 'Cache warmup failed', { error })
      throw error
    }
  }

  private generateCacheKey(
    key: string,
    namespace?: string
  ): string {
    const base = namespace
      ? `cache:${namespace}:${key}`
      : `cache:${key}`

    return createHash('md5')
      .update(base)
      .digest('hex')
  }

  private async compress(data: any): Promise<Buffer> {
    const json = JSON.stringify(data)
    return gzipAsync(Buffer.from(json))
  }

  private async decompress(data: Buffer): Promise<any> {
    const decompressed = await ungzipAsync(data)
    return JSON.parse(decompressed.toString())
  }

  private async getFromCache(
    key: string,
    type: string
  ): Promise<any> {
    switch (type) {
      case 'redis':
        return redis.get(key)
      case 'memcached':
        return new Promise((resolve, reject) => {
          memcached.get(key, (err, data) => {
            if (err) reject(err)
            else resolve(data)
          })
        })
      case 's3':
        const { Body } = await s3
          .getObject({
            Bucket: 'cache',
            Key: key
          })
          .promise()
        return Body
      default:
        return null
    }
  }

  private async storeInCache(
    key: string,
    value: any,
    type: string,
    ttl: number
  ) {
    switch (type) {
      case 'redis':
        await redis.set(key, value, 'EX', ttl)
        break
      case 'memcached':
        await new Promise((resolve, reject) => {
          memcached.set(key, value, ttl, err => {
            if (err) reject(err)
            else resolve(null)
          })
        })
        break
      case 's3':
        await s3
          .putObject({
            Bucket: 'cache',
            Key: key,
            Body: value,
            Metadata: {
              ttl: ttl.toString()
            }
          })
          .promise()
        break
    }
  }

  private async removeFromCache(
    key: string,
    type: string
  ) {
    switch (type) {
      case 'redis':
        await redis.del(key)
        break
      case 'memcached':
        await new Promise((resolve, reject) => {
          memcached.del(key, err => {
            if (err) reject(err)
            else resolve(null)
          })
        })
        break
      case 's3':
        await s3
          .deleteObject({
            Bucket: 'cache',
            Key: key
          })
          .promise()
        break
    }
  }

  private async storeTags(
    key: string,
    tags: string[]
  ) {
    await Promise.all(
      tags.map(tag =>
        redis.sadd(`cache_tag:${tag}`, key)
      )
    )
  }

  private async getKeysByTags(
    tags: string[]
  ): Promise<string[]> {
    const keys = await redis.sinter(
      ...tags.map(tag => `cache_tag:${tag}`)
    )
    return keys
  }

  private async removeByPattern(
    pattern: string,
    type: string
  ) {
    const keys = await redis.keys(pattern)
    if (keys.length > 0) {
      await Promise.all(
        keys.map(key => this.removeFromCache(key, type))
      )
    }
  }
}

// Cache Middleware für API-Routen
export async function withCache(
  req: Request,
  handler: () => Promise<Response>,
  options: {
    ttl?: number,
    key?: string | ((req: Request) => string),
    invalidateOn?: string[]
  } = {}
) {
  const cache = new CacheService()
  
  const cacheKey = typeof options.key === 'function'
    ? options.key(req)
    : options.key || req.url

  // Prüfe Cache
  const cached = await cache.get(cacheKey)
  if (cached) {
    return new Response(JSON.stringify(cached), {
      headers: { 'Content-Type': 'application/json' }
    })
  }

  // Führe Handler aus
  const response = await handler()
  const data = await response.json()

  // Cache Ergebnis
  await cache.set(cacheKey, data, {
    ttl: options.ttl
  })

  return new Response(JSON.stringify(data), {
    headers: { 'Content-Type': 'application/json' }
  })
}

// React Query Integration
export function useCachedQuery(key: string, fetcher: () => Promise<any>) {
  const cache = new CacheService()

  return useQuery(key, async () => {
    const cached = await cache.get(key)
    if (cached) return cached

    const data = await fetcher()
    await cache.set(key, data)
    return data
  })
} 