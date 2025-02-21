import { prisma } from './prisma'
import { Redis } from 'ioredis'
import { createHash } from 'crypto'
import { evaluateCondition } from './conditions'

const redis = new Redis(process.env.REDIS_URL!)

interface ExperimentContext {
  userId?: string
  userAgent?: string
  path?: string
  [key: string]: any
}

export class ExperimentManager {
  private static instance: ExperimentManager

  private constructor() {}

  static getInstance(): ExperimentManager {
    if (!ExperimentManager.instance) {
      ExperimentManager.instance = new ExperimentManager()
    }
    return ExperimentManager.instance
  }

  async getVariant(
    experimentName: string,
    context: ExperimentContext
  ): Promise<Variant | null> {
    const experiment = await prisma.experiment.findUnique({
      where: { name: experimentName },
      include: { variants: true }
    })

    if (!experiment || experiment.status !== 'RUNNING') {
      return null
    }

    // Prüfe Targeting-Bedingungen
    if (experiment.conditions && !this.checkConditions(experiment.conditions, context)) {
      return null
    }

    // Deterministische Varianten-Zuweisung
    const variantIndex = this.getConsistentVariant(
      experiment.id,
      context.userId,
      experiment.variants.map(v => v.weight)
    )

    return experiment.variants[variantIndex]
  }

  async trackMetric(
    experimentName: string,
    metricName: string,
    value: number,
    context: ExperimentContext
  ) {
    const experiment = await prisma.experiment.findUnique({
      where: { name: experimentName },
      include: {
        variants: true,
        metrics: {
          where: { name: metricName }
        }
      }
    })

    if (!experiment || !experiment.metrics.length) return

    const variant = await this.getVariant(experimentName, context)
    if (!variant) return

    // Speichere Ergebnis
    await prisma.result.create({
      data: {
        experimentId: experiment.id,
        variantId: variant.id,
        metricId: experiment.metrics[0].id,
        value,
        userId: context.userId
      }
    })

    // Aktualisiere Cache für Echtzeit-Analyse
    const key = `exp:${experiment.id}:${variant.id}:${experiment.metrics[0].id}`
    await redis.hincrby(key, 'count', 1)
    await redis.hincrbyfloat(key, 'sum', value)
  }

  async getResults(experimentId: string) {
    const results = await prisma.result.groupBy({
      by: ['variantId', 'metricId'],
      where: { experimentId },
      _count: true,
      _sum: { value: true },
      _avg: { value: true }
    })

    // Statistische Signifikanz berechnen
    return this.calculateStatistics(results)
  }

  private getConsistentVariant(
    experimentId: string,
    userId: string = 'anonymous',
    weights: number[]
  ): number {
    const hash = createHash('sha256')
      .update(`${experimentId}:${userId}`)
      .digest('hex')
    
    const hashNum = parseInt(hash.slice(0, 8), 16)
    const totalWeight = weights.reduce((a, b) => a + b, 0)
    const normalized = (hashNum / 0xffffffff) * totalWeight
    
    let sum = 0
    for (let i = 0; i < weights.length; i++) {
      sum += weights[i]
      if (normalized <= sum) return i
    }
    
    return 0
  }

  private checkConditions(conditions: any, context: ExperimentContext): boolean {
    return evaluateCondition(conditions, context)
  }

  private calculateStatistics(results: any[]) {
    // Implementiere statistische Tests (z.B. Chi-Quadrat, t-Test)
    // Berechne Konfidenzintervalle
    // Bestimme Gewinner-Variante
    return {
      results,
      significance: 0.95, // Beispiel
      winner: results[0]?.variantId
    }
  }
} 