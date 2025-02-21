import { Redis } from 'ioredis'
import { prisma } from '../prisma'
import { LoggerService } from '../logger'
import { CacheService } from '../cache'
import { IntlMessageFormat } from 'intl-messageformat'
import { DateTime } from 'luxon'
import { createHash } from 'crypto'
import { DeepL } from 'deepl-node'
import { OpenAI } from 'openai'
import ISO6391 from 'iso-639-1'

const logger = new LoggerService()
const cache = new CacheService()
const redis = new Redis(process.env.REDIS_URL!)
const deepl = new DeepL(process.env.DEEPL_API_KEY!)
const openai = new OpenAI(process.env.OPENAI_API_KEY!)

export class I18nService {
  async translate(key: string, locale: string, data?: any) {
    try {
      const cacheKey = `i18n:${locale}:${key}:${createHash('md5').update(JSON.stringify(data)).digest('hex')}`
      const cached = await redis.get(cacheKey)
      if (cached) return JSON.parse(cached)

      const translation = await prisma.translation.findFirst({
        where: { key, locale }
      })

      if (!translation) {
        return key
      }

      const message = new IntlMessageFormat(translation.value, locale)
      const result = message.format(data)

      await redis.set(cacheKey, JSON.stringify(result), 'EX', 3600)
      return result
    } catch (error) {
      logger.log('error', 'Translation failed', { error })
      return key
    }
  }

  async formatDate(date: Date, locale: string, options?: Intl.DateTimeFormatOptions) {
    return DateTime.fromJSDate(date).setLocale(locale).toLocaleString(options)
  }

  async formatNumber(number: number, locale: string, options?: Intl.NumberFormatOptions) {
    return new Intl.NumberFormat(locale, options).format(number)
  }

  async formatCurrency(amount: number, currency: string, locale: string) {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency
    }).format(amount)
  }

  async loadTranslations(
    namespace: string,
    lang: string
  ): Promise<Record<string, any>> {
    // Cache-Check
    const cached = await redis.get(
      `translations:${namespace}:${lang}`
    )
    if (cached) return JSON.parse(cached)

    // DB-Abruf
    const translations = await prisma.translation.findMany({
      where: {
        namespace,
        targetLang: lang
      }
    })

    const formatted = this.formatTranslations(translations)

    // Cache für 1 Stunde
    await redis.set(
      `translations:${namespace}:${lang}`,
      JSON.stringify(formatted),
      'EX',
      3600
    )

    return formatted
  }

  async detectLanguage(text: string): Promise<string> {
    try {
      const result = await deepl.detectLanguage(text)
      return result.languageCode
    } catch (error) {
      logger.log('error', 'Language detection failed', { error })
      throw error
    }
  }

  async validateTranslations(
    namespace: string
  ): Promise<Array<{
    key: string
    missing: string[]
    outdated: string[]
  }>> {
    const languages = await this.getSupportedLanguages()
    const translations = await prisma.translation.findMany({
      where: { namespace }
    })

    return this.analyzeTranslationCoverage(
      translations,
      languages
    )
  }

  private async translateWithAI(
    text: string,
    targetLang: string,
    context?: string
  ): Promise<string> {
    const prompt = `
      Translate the following text to ${ISO6391.getName(targetLang)}.
      ${context ? `Context: ${context}\n` : ''}
      Text: ${text}
    `

    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3
    })

    return response.choices[0].message.content || text
  }

  private async translateWithDeepL(
    text: string,
    targetLang: string,
    sourceLang: string
  ): Promise<string> {
    const result = await deepl.translateText(
      text,
      sourceLang,
      targetLang
    )
    return result.text
  }

  private async translateObject(
    obj: Record<string, any>,
    targetLang: string,
    options: any
  ): Promise<Record<string, any>> {
    const translated: Record<string, any> = {}

    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'string') {
        translated[key] = await this.translate(
          key,
          targetLang,
          value
        )
      } else if (typeof value === 'object') {
        translated[key] = await this.translateObject(
          value,
          targetLang,
          options
        )
      } else {
        translated[key] = value
      }
    }

    return translated
  }

  private generateCacheKey(
    text: string | Record<string, any>,
    sourceLang: string,
    targetLang: string,
    namespace?: string
  ): string {
    const content = typeof text === 'string'
      ? text
      : JSON.stringify(text)

    return createHash('md5')
      .update(`${content}:${sourceLang}:${targetLang}:${namespace}`)
      .digest('hex')
  }

  private async getCachedTranslation(
    text: string | Record<string, any>,
    sourceLang: string,
    targetLang: string,
    namespace?: string
  ): Promise<any | null> {
    const key = this.generateCacheKey(
      text,
      sourceLang,
      targetLang,
      namespace
    )
    const cached = await redis.get(`translation:${key}`)
    return cached ? JSON.parse(cached) : null
  }

  private async cacheTranslation(
    original: any,
    translation: any,
    sourceLang: string,
    targetLang: string,
    namespace?: string
  ) {
    const key = this.generateCacheKey(
      original,
      sourceLang,
      targetLang,
      namespace
    )
    await redis.set(
      `translation:${key}`,
      JSON.stringify(translation),
      'EX',
      86400 // 24 Stunden
    )
  }

  private async saveTranslation(
    original: any,
    translation: any,
    sourceLang: string,
    targetLang: string,
    namespace?: string
  ) {
    await prisma.translation.create({
      data: {
        key: typeof original === 'string'
          ? original
          : JSON.stringify(original),
        value: typeof translation === 'string'
          ? translation
          : JSON.stringify(translation),
        sourceLang,
        targetLang,
        namespace,
        createdAt: new Date()
      }
    })
  }

  private formatTranslations(
    translations: any[]
  ): Record<string, any> {
    return translations.reduce((acc, t) => {
      try {
        acc[t.key] = JSON.parse(t.value)
      } catch {
        acc[t.key] = t.value
      }
      return acc
    }, {})
  }

  private async getSupportedLanguages(): Promise<string[]> {
    return ['en', 'de', 'fr', 'es', 'it', 'ja', 'zh']
  }

  private analyzeTranslationCoverage(
    translations: any[],
    languages: string[]
  ) {
    // Implementiere Analyse der Übersetzungsabdeckung
    return []
  }
} 