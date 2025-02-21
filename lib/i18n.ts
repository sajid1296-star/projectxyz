import { createInstance } from 'i18next'
import { initReactI18next } from 'react-i18next'
import { prisma } from './prisma'
import { Redis } from 'ioredis'
import { format } from 'date-fns'
import * as locales from 'date-fns/locale'

const redis = new Redis(process.env.REDIS_URL!)

export class I18nManager {
  private static instance: I18nManager
  private i18n: any
  private defaultLocale: string = 'de-DE'

  private constructor() {
    this.i18n = createInstance()
    this.initialize()
  }

  static getInstance(): I18nManager {
    if (!I18nManager.instance) {
      I18nManager.instance = new I18nManager()
    }
    return I18nManager.instance
  }

  private async initialize() {
    // Lade alle aktiven Locales
    const activeLocales = await prisma.locale.findMany({
      where: { active: true }
    })

    // Lade Übersetzungen aus Cache oder DB
    const resources = await this.loadTranslations(
      activeLocales.map(l => l.code)
    )

    // Konfiguriere i18next
    await this.i18n
      .use(initReactI18next)
      .init({
        resources,
        fallbackLng: this.defaultLocale,
        interpolation: {
          escapeValue: false
        },
        detection: {
          order: ['cookie', 'header'],
          caches: ['cookie']
        }
      })
  }

  private async loadTranslations(locales: string[]) {
    const resources: any = {}

    await Promise.all(
      locales.map(async locale => {
        // Versuche Cache
        const cached = await redis.get(`translations:${locale}`)
        if (cached) {
          resources[locale] = JSON.parse(cached)
          return
        }

        // Lade aus DB
        const translations = await prisma.translation.findMany({
          where: { locale }
        })

        // Gruppiere nach Namespace
        resources[locale] = translations.reduce((acc, t) => {
          if (!acc[t.namespace]) acc[t.namespace] = {}
          acc[t.namespace][t.key] = t.value
          return acc
        }, {})

        // Cache für 1 Stunde
        await redis.set(
          `translations:${locale}`,
          JSON.stringify(resources[locale]),
          'EX',
          3600
        )
      })
    )

    return resources
  }

  async translate(
    key: string,
    locale: string,
    namespace: string = 'common',
    params?: object
  ) {
    return this.i18n.t(`${namespace}:${key}`, {
      lng: locale,
      ...params
    })
  }

  async formatDate(
    date: Date,
    locale: string,
    format?: string
  ) {
    const localeObj = await prisma.locale.findUnique({
      where: { code: locale }
    })

    return format(date, format || localeObj?.dateFormat || 'PP', {
      locale: locales[locale.split('-')[0]]
    })
  }

  async formatCurrency(
    amount: number,
    locale: string
  ) {
    const localeObj = await prisma.locale.findUnique({
      where: { code: locale }
    })

    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: localeObj?.currency || 'EUR'
    }).format(amount)
  }

  async updateTranslation(
    locale: string,
    namespace: string,
    key: string,
    value: string
  ) {
    // Aktualisiere DB
    await prisma.translation.upsert({
      where: {
        locale_namespace_key: {
          locale,
          namespace,
          key
        }
      },
      update: { value },
      create: {
        locale,
        namespace,
        key,
        value
      }
    })

    // Invalidiere Cache
    await redis.del(`translations:${locale}`)

    // Aktualisiere i18next
    this.i18n.addResourceBundle(
      locale,
      namespace,
      { [key]: value },
      true,
      true
    )
  }
} 