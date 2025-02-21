import { Redis } from 'ioredis'
import { LoggerService } from '../logger'
import { NotificationService } from '../notifications'
import { PerformanceService } from '../performance'
import { ErrorService } from '../errors'
import { createHash, randomBytes, createCipheriv } from 'crypto'
import { Helmet } from 'helmet'
import { WAF } from '@aws-sdk/client-waf'
import { CloudflareWAF } from '@cloudflare/waf'
import { Snyk } from '@snyk/sdk'
import { OWASP } from 'owasp-zap'

const logger = new LoggerService()
const notifications = new NotificationService()
const performance = new PerformanceService()
const errors = new ErrorService()
const redis = new Redis(process.env.REDIS_URL!)

export class SecurityService {
  private encryptionKey: Buffer
  private waf: WAF
  private cloudflareWAF: CloudflareWAF
  
  constructor() {
    this.encryptionKey = Buffer.from(process.env.ENCRYPTION_KEY!, 'hex')
    this.waf = new WAF()
    this.cloudflareWAF = new CloudflareWAF()
    this.initializeSecurity()
  }

  async encrypt(data: string): Promise<string> {
    const iv = randomBytes(16)
    const cipher = createCipheriv('aes-256-gcm', this.encryptionKey, iv)
    const encrypted = Buffer.concat([
      cipher.update(data, 'utf8'),
      cipher.final()
    ])
    const tag = cipher.getAuthTag()
    return `${iv.toString('hex')}:${encrypted.toString('hex')}:${tag.toString('hex')}`
  }

  async decrypt(data: string): Promise<string> {
    const [ivHex, encryptedHex, tagHex] = data.split(':')
    const iv = Buffer.from(ivHex, 'hex')
    const encrypted = Buffer.from(encryptedHex, 'hex')
    const tag = Buffer.from(tagHex, 'hex')
    const decipher = createCipheriv('aes-256-gcm', this.encryptionKey, iv)
    decipher.setAuthTag(tag)
    return decipher.update(encrypted) + decipher.final('utf8')
  }

  async scanRequest(req: Request): Promise<{
    safe: boolean
    threats: string[]
  }> {
    try {
      const threats: string[] = []

      // WAF Checks
      const wafResult = await this.waf.scanRequest({
        headers: Object.fromEntries(req.headers),
        body: await req.text(),
        ip: req.headers.get('x-forwarded-for')
      })

      if (!wafResult.safe) {
        threats.push(...wafResult.threats)
      }

      // OWASP Checks
      const owaspResult = await OWASP.scanRequest(req)
      if (!owaspResult.safe) {
        threats.push(...owaspResult.threats)
      }

      // Rate Limiting Check
      const rateLimited = await this.checkRateLimit(req)
      if (rateLimited) {
        threats.push('RATE_LIMIT_EXCEEDED')
      }

      // Dependency Check
      await this.checkDependencies()

      const safe = threats.length === 0
      if (!safe) {
        await this.handleThreat(req, threats)
      }

      return { safe, threats }
    } catch (error) {
      logger.log('error', 'Security scan failed', { error })
      return { safe: false, threats: ['SCAN_ERROR'] }
    }
  }

  private async initializeSecurity() {
    // Security Headers
    Helmet.contentSecurityPolicy({
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"]
      }
    })

    // CORS
    Helmet.cors({
      origin: process.env.ALLOWED_ORIGINS?.split(','),
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      credentials: true
    })

    // XSS Protection
    Helmet.xssFilter()
    Helmet.noSniff()

    // HSTS
    Helmet.hsts({
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true
    })
  }

  private async handleThreat(req: Request, threats: string[]) {
    // Alert
    await notifications.send({
      type: 'SECURITY_ALERT',
      recipients: [{
        id: 'security-team',
        channels: ['slack', 'email']
      }],
      template: 'security_alert',
      data: { threats, req }
    })

    // Block IP
    await this.blockIP(req.headers.get('x-forwarded-for')!)

    // Log Event
    await logger.log('warn', 'Security threat detected', {
      threats,
      ip: req.headers.get('x-forwarded-for'),
      path: req.url
    })
  }

  private async checkDependencies() {
    const vulns = await Snyk.test({
      path: process.cwd(),
      dev: false
    })

    if (vulns.length > 0) {
      await notifications.send({
        type: 'VULNERABILITY_ALERT',
        recipients: [{
          id: 'security-team',
          channels: ['slack']
        }],
        template: 'vulnerability_alert',
        data: { vulns }
      })
    }
  }

  private async blockIP(ip: string) {
    await Promise.all([
      this.waf.blockIP(ip),
      this.cloudflareWAF.blockIP(ip)
    ])
  }

  private async checkRateLimit(req: Request): Promise<boolean> {
    const key = `ratelimit:${req.headers.get('x-forwarded-for')}`
    const count = await redis.incr(key)
    if (count === 1) {
      await redis.expire(key, 60)
    }
    return count > 100
  }
} 
} 