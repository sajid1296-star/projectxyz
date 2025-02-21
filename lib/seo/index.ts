import { prisma } from '../prisma'
import { SitemapStream, streamToPromise } from 'sitemap'
import { createGzip } from 'zlib'
import { Redis } from 'ioredis'
import { minify } from 'html-minifier'
import robotsTxt from 'generate-robotstxt'

const redis = new Redis(process.env.REDIS_URL!)

export class SEOService {
  async getMetaTags(path: string) {
    // Cache-Check
    const cached = await redis.get(`seo:${path}`)
    if (cached) return JSON.parse(cached)

    // Lade SEO-Einstellungen
    const seo = await prisma.sEOSettings.findUnique({
      where: { path }
    })

    if (!seo) return this.getDefaultMetaTags(path)

    const tags = {
      title: seo.title,
      description: seo.description,
      keywords: seo.keywords.join(','),
      canonical: seo.canonical,
      robots: seo.robots,
      og: {
        title: seo.ogTitle || seo.title,
        description: seo.ogDescription || seo.description,
        image: seo.ogImage,
        url: `${process.env.NEXT_PUBLIC_SITE_URL}${path}`
      },
      schema: seo.schema
    }

    // Cache für 1 Stunde
    await redis.set(
      `seo:${path}`,
      JSON.stringify(tags),
      'EX',
      3600
    )

    return tags
  }

  async generateSitemap() {
    const smStream = new SitemapStream({
      hostname: process.env.NEXT_PUBLIC_SITE_URL
    })
    const pipeline = smStream.pipe(createGzip())

    // Lade alle aktiven Konfigurationen
    const configs = await prisma.sitemapConfig.findMany({
      where: { isActive: true }
    })

    // Verarbeite jede Konfiguration
    for (const config of configs) {
      const urls = await this.executeQuery(config.query)
      urls.forEach(url => {
        smStream.write({
          url: url.path,
          changefreq: config.changefreq,
          priority: config.priority,
          lastmod: url.updatedAt
        })
      })
    }

    smStream.end()
    const sitemap = await streamToPromise(pipeline)

    // Cache für 24 Stunden
    await redis.set('sitemap', sitemap, 'EX', 86400)

    return sitemap
  }

  async generateRobotsTxt() {
    const robotsTxtContent = await robotsTxt({
      host: process.env.NEXT_PUBLIC_SITE_URL,
      sitemap: `${process.env.NEXT_PUBLIC_SITE_URL}/sitemap.xml`,
      policy: [
        {
          userAgent: '*',
          allow: '/',
          disallow: [
            '/api/',
            '/admin/',
            '/private/',
          ]
        }
      ]
    })

    await redis.set('robots.txt', robotsTxtContent, 'EX', 86400)
    return robotsTxtContent
  }

  async handleRedirects(path: string) {
    const redirect = await prisma.redirect.findFirst({
      where: {
        OR: [
          { source: path },
          {
            isRegex: true,
            source: {
              contains: path.split('/')[1] // Simple regex match
            }
          }
        ],
        isActive: true
      }
    })

    if (!redirect) return null

    if (redirect.isRegex) {
      const regex = new RegExp(redirect.source)
      return {
        destination: path.replace(regex, redirect.destination),
        statusCode: redirect.statusCode
      }
    }

    return {
      destination: redirect.destination,
      statusCode: redirect.statusCode
    }
  }

  private getDefaultMetaTags(path: string) {
    return {
      title: 'Default Title',
      description: 'Default Description',
      keywords: '',
      robots: 'index,follow',
      og: {
        title: 'Default Title',
        description: 'Default Description',
        url: `${process.env.NEXT_PUBLIC_SITE_URL}${path}`
      }
    }
  }

  private async executeQuery(query: string) {
    // Sicheres Ausführen von dynamischen Queries
    // Implementiere entsprechende Sicherheitsmaßnahmen
    return []
  }
} 