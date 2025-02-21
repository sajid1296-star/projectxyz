import { Redis } from 'ioredis'
import { compress, decompress } from 'lz4-js'
import { prisma } from './prisma'

// Redis-Client für schnellen Cache
const redis = new Redis(process.env.REDIS_URL!)

// Multi-Level Caching System
export class CacheManager {
  private static instance: CacheManager
  
  private constructor() {}

  static getInstance(): CacheManager {
    if (!CacheManager.instance) {
      CacheManager.instance = new CacheManager()
    }
    return CacheManager.instance
  }

  async get(key: string, type: CacheType): Promise<any> {
    // Level 1: Memory Cache (Node.js)
    const memoryCache = globalThis.__memoryCache?.[key]
    if (memoryCache) return memoryCache

    // Level 2: Redis Cache
    const redisCache = await redis.get(key)
    if (redisCache) {
      const value = JSON.parse(redisCache)
      this.setMemoryCache(key, value)
      return value
    }

    // Level 3: Database Cache
    const dbCache = await prisma.cacheEntry.findUnique({
      where: { key }
    })

    if (dbCache) {
      const value = JSON.parse(decompress(dbCache.value).toString())
      await this.set(key, value, type)
      return value
    }

    return null
  }

  async set(key: string, value: any, type: CacheType, ttl: number = 3600): Promise<void> {
    const compressed = compress(JSON.stringify(value))

    // Parallel Updates für alle Cache-Level
    await Promise.all([
      // Memory Cache
      this.setMemoryCache(key, value),
      
      // Redis Cache
      redis.set(key, JSON.stringify(value), 'EX', ttl),
      
      // Database Cache
      prisma.cacheEntry.upsert({
        where: { key },
        update: {
          value: compressed,
          ttl,
          hits: { increment: 1 },
          size: compressed.length,
          updatedAt: new Date()
        },
        create: {
          key,
          value: compressed,
          type,
          ttl,
          size: compressed.length
        }
      })
    ])
  }

  private setMemoryCache(key: string, value: any): void {
    if (!globalThis.__memoryCache) {
      globalThis.__memoryCache = {}
    }
    globalThis.__memoryCache[key] = value
  }

  async invalidate(pattern: string): Promise<void> {
    // Lösche aus allen Cache-Levels
    const keys = await redis.keys(pattern)
    
    await Promise.all([
      // Memory Cache
      this.invalidateMemoryCache(pattern),
      
      // Redis Cache
      redis.del(keys),
      
      // Database Cache
      prisma.cacheEntry.deleteMany({
        where: {
          key: {
            contains: pattern
          }
        }
      })
    ])
  }

  private invalidateMemoryCache(pattern: string): void {
    if (!globalThis.__memoryCache) return
    
    const regex = new RegExp(pattern.replace('*', '.*'))
    Object.keys(globalThis.__memoryCache)
      .filter(key => regex.test(key))
      .forEach(key => delete globalThis.__memoryCache[key])
  }
}

// CDN und Asset Management
export class CDNManager {
  private baseUrl: string

  constructor() {
    this.baseUrl = process.env.CDN_BASE_URL!
  }

  async uploadAsset(
    file: Buffer,
    path: string,
    options: {
      variants?: string[]
      metadata?: any
    } = {}
  ): Promise<CDNAsset> {
    const hash = await this.generateHash(file)
    const type = await this.detectMimeType(file)
    
    // Erstelle Asset-Eintrag
    const asset = await prisma.cDNAsset.create({
      data: {
        path,
        type,
        size: file.length,
        hash,
        variants: options.variants ? {
          original: path,
          ...await this.generateVariants(file, path, options.variants)
        } : undefined,
        metadata: options.metadata
      }
    })

    // Upload zum CDN
    await this.uploadToStorage(file, path)
    
    // Markiere als hochgeladen
    await prisma.cDNAsset.update({
      where: { id: asset.id },
      data: { uploaded: true }
    })

    return asset
  }

  getAssetUrl(path: string, variant?: string): string {
    return `${this.baseUrl}/${variant || 'original'}/${path}`
  }

  private async generateVariants(
    file: Buffer,
    path: string,
    variants: string[]
  ): Promise<Record<string, string>> {
    // Implementiere Bildverarbeitung (z.B. mit Sharp)
    // Generiere verschiedene Größen, Formate etc.
    return {}
  }

  private async uploadToStorage(file: Buffer, path: string): Promise<void> {
    // Implementiere Upload zu S3, CloudFlare etc.
  }

  private async generateHash(file: Buffer): Promise<string> {
    // Implementiere Content-Hash-Generierung
    return ''
  }

  private async detectMimeType(file: Buffer): Promise<string> {
    // Implementiere MIME-Type-Erkennung
    return ''
  }
} 