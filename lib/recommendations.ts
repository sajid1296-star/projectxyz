import { prisma } from './prisma'
import { CacheManager } from './cache'
import * as tf from '@tensorflow/tfjs-node'
import { Redis } from 'ioredis'

const cache = CacheManager.getInstance()
const redis = new Redis(process.env.REDIS_URL!)

export class RecommendationEngine {
  private model: tf.LayersModel | null = null

  async initialize() {
    // Lade vortrainiertes Modell
    this.model = await tf.loadLayersModel(
      'file://models/recommendation_model/model.json'
    )
  }

  async trackBehavior(
    userId: string,
    productId: string,
    type: BehaviorType,
    metadata?: any
  ) {
    // Speichere Benutzerverhalten
    await prisma.userBehavior.create({
      data: {
        userId,
        productId,
        type,
        metadata
      }
    })

    // Aktualisiere Trending-Score im Redis
    if (type === 'VIEW' || type === 'PURCHASE') {
      const score = type === 'PURCHASE' ? 5 : 1
      await redis.zincrby('trending_products', score, productId)
    }

    // Invalidiere personalisierte Empfehlungen
    await cache.invalidate(`recommendations:user:${userId}`)
  }

  async getSimilarProducts(productId: string, limit: number = 10) {
    const cacheKey = `recommendations:similar:${productId}`
    const cached = await cache.get(cacheKey, 'QUERY')
    if (cached) return cached

    // Hole Produktvektor
    const sourceVector = await prisma.productVector.findUnique({
      where: { productId }
    })

    if (!sourceVector) return []

    // Finde ähnliche Produkte mittels Vektorähnlichkeit
    const similar = await prisma.$queryRaw`
      SELECT 
        p.id,
        p.name,
        1 - (pv.vector <-> ${sourceVector.vector}::vector) as similarity
      FROM "ProductVector" pv
      JOIN "Product" p ON p.id = pv."productId"
      WHERE pv."productId" != ${productId}
      ORDER BY similarity DESC
      LIMIT ${limit}
    `

    // Cache Ergebnisse
    await cache.set(cacheKey, similar, 'QUERY', 3600)

    return similar
  }

  async getPersonalizedRecommendations(userId: string, limit: number = 24) {
    const cacheKey = `recommendations:user:${userId}`
    const cached = await cache.get(cacheKey, 'QUERY')
    if (cached) return cached

    // Hole Benutzerverhalten
    const behaviors = await prisma.userBehavior.findMany({
      where: { userId },
      orderBy: { timestamp: 'desc' },
      take: 100,
      include: {
        product: {
          include: {
            vector: true
          }
        }
      }
    })

    if (!behaviors.length) {
      return this.getTrendingProducts(limit)
    }

    // Erstelle Benutzer-Embedding
    const userVector = await this.createUserEmbedding(behaviors)

    // Vorhersage mit ML-Modell
    const predictions = await this.predictInterests(userVector)

    // Hole empfohlene Produkte
    const recommendations = await prisma.product.findMany({
      where: {
        id: {
          in: predictions.map(p => p.productId)
        }
      },
      include: {
        images: true,
        category: true,
        brand: true
      },
      take: limit
    })

    // Cache Ergebnisse
    await cache.set(cacheKey, recommendations, 'QUERY', 1800)

    return recommendations
  }

  async getTrendingProducts(limit: number = 10) {
    const trending = await redis.zrevrange('trending_products', 0, limit - 1)

    return prisma.product.findMany({
      where: {
        id: {
          in: trending
        }
      },
      include: {
        images: true,
        category: true,
        brand: true
      }
    })
  }

  private async createUserEmbedding(behaviors: UserBehavior[]) {
    // Gewichte für verschiedene Verhaltenstypen
    const weights = {
      PURCHASE: 1.0,
      CART: 0.5,
      VIEW: 0.2,
      WISHLIST: 0.3,
      REVIEW: 0.4
    }

    // Kombiniere Produktvektoren mit Gewichten
    const weightedVectors = behaviors.map(behavior => {
      const vector = behavior.product.vector.vector
      const weight = weights[behavior.type]
      return vector.map(v => v * weight)
    })

    // Berechne Durchschnittsvektor
    const embedding = weightedVectors.reduce(
      (acc, vec) => acc.map((v, i) => v + vec[i]),
      new Array(weightedVectors[0].length).fill(0)
    ).map(v => v / weightedVectors.length)

    return embedding
  }

  private async predictInterests(userVector: number[]) {
    if (!this.model) await this.initialize()

    // Konvertiere zu Tensor
    const input = tf.tensor2d([userVector])

    // Vorhersage
    const predictions = await this.model!.predict(input) as tf.Tensor

    // Konvertiere zu Array und sortiere
    const scores = await predictions.array()
    return scores[0]
      .map((score, idx) => ({
        productId: idx.toString(),
        score
      }))
      .sort((a, b) => b.score - a.score)
  }
} 