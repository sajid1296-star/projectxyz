import { Redis } from 'ioredis'
import { LoggerService } from '../logger'
import { ErrorService } from '../errors'
import { PerformanceService } from '../performance'
import { createHash } from 'crypto'
import { Token } from '@token-bucket/token-bucket'

const logger = new LoggerService()
const errors = new ErrorService()
const performance = new PerformanceService()
const redis = new Redis(process.env.REDIS_URL!)

export class RateLimitService {
  async limit(key: string, options: {
    max: number
    windowMs: number
    type?: 'fixed' | 'sliding' | 'token'
    cost?: number
    burst?: number
    headers?: boolean
  } = {}) {
    try {
      const {
        max,
        windowMs,
        type = 'sliding',
        cost = 1,
        burst = max,
        headers = true
      } = options

      const hash = this.generateKey(key)

      switch (type) {
        case 'fixed':
          return this.fixedWindow(hash, max, windowMs, headers)
        case 'sliding':
          return this.slidingWindow(hash, max, windowMs, headers)
        case 'token':
          return this.tokenBucket(hash, max, burst, cost, headers)
      }
    } catch (error) {
      await this.handleError(error, key)
      return { success: false, remaining: 0 }
    }
  }

  private async fixedWindow(hash: string, max: number, windowMs: number, headers: boolean) {
    const now = Math.floor(Date.now() / windowMs)
    const key = `ratelimit:${hash}:${now}`
    
    const count = await redis.incr(key)
    if (count === 1) {
      await redis.expire(key, windowMs / 1000)
    }

    const remaining = Math.max(0, max - count)
    const reset = (now + 1) * windowMs

    await this.trackMetric(hash, count >= max)

    return {
      success: count <= max,
      remaining,
      reset,
      headers: headers ? this.generateHeaders(remaining, reset) : null
    }
  }

  private async slidingWindow(hash: string, max: number, windowMs: number, headers: boolean) {
    const now = Date.now()
    const key = `ratelimit:${hash}`
    
    await redis.zremrangebyscore(key, 0, now - windowMs)
    await redis.zadd(key, now, now.toString())
    await redis.expire(key, windowMs / 1000)
    
    const count = await redis.zcard(key)
    const remaining = Math.max(0, max - count)
    const reset = now + windowMs

    await this.trackMetric(hash, count >= max)

    return {
      success: count <= max,
      remaining,
      reset,
      headers: headers ? this.generateHeaders(remaining, reset) : null
    }
  }

  private async tokenBucket(hash: string, rate: number, burst: number, cost: number, headers: boolean) {
    const key = `ratelimit:${hash}:tokens`
    const now = Date.now()
    
    const bucket = new Token({ rate, burst })
    const tokens = await redis.get(key) || burst
    
    const allowed = bucket.tryConsume(tokens, cost)
    await redis.set(key, bucket.tokens, 'EX', 60)

    const remaining = Math.floor(bucket.tokens)
    const reset = now + (1000 * (burst - remaining)) / rate

    await this.trackMetric(hash, !allowed)

    return {
      success: allowed,
      remaining,
      reset,
      headers: headers ? this.generateHeaders(remaining, reset) : null
    }
  }

  private generateKey(key: string): string {
    return createHash('md5').update(key).digest('hex')
  }

  private generateHeaders(remaining: number, reset: number) {
    return {
      'X-RateLimit-Remaining': remaining.toString(),
      'X-RateLimit-Reset': new Date(reset).toUTCString()
    }
  }

  private async trackMetric(key: string, limited: boolean) {
    await performance.trackMetric({
      name: 'rate_limit',
      value: 1,
      type: 'counter',
      labels: { key, limited: limited.toString() }
    })
  }

  private async handleError(error: any, key: string) {
    await errors.handleError(error, {
      type: 'RATE_LIMIT_ERROR',
      severity: 'warn',
      metadata: { key }
    })
  }
} 