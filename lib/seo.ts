import { prisma } from './prisma'
import { NextResponse } from 'next/server'

interface PerformanceMetrics {
  fcp: number
  lcp: number
  fid: number
  cls: number
  ttfb: number
}

export async function trackPerformance(
  path: string,
  metrics: PerformanceMetrics,
  userAgent: string,
  device: string,
  connection?: string
) {
  return prisma.performance.create({
    data: {
      path,
      ...metrics,
      userAgent,
      device,
      connection,
      metadata: {
        connect: {
          path
        }
      }
    }
  })
}

export async function generateSitemap() {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL

  // Sammle alle dynamischen Routen
  const [products, categories, pages] = await Promise.all([
    prisma.product.findMany({
      select: { slug: true, updatedAt: true }
    }),
    prisma.category.findMany({
      select: { slug: true, updatedAt: true }
    }),
    prisma.sEOMetadata.findMany({
      select: { path: true, updatedAt: true }
    })
  ])

  // Generiere XML
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
    <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
      ${products.map(product => `
        <url>
          <loc>${baseUrl}/products/${product.slug}</loc>
          <lastmod>${product.updatedAt.toISOString()}</lastmod>
          <changefreq>daily</changefreq>
          <priority>0.8</priority>
        </url>
      `).join('')}
      ${categories.map(category => `
        <url>
          <loc>${baseUrl}/categories/${category.slug}</loc>
          <lastmod>${category.updatedAt.toISOString()}</lastmod>
          <changefreq>weekly</changefreq>
          <priority>0.7</priority>
        </url>
      `).join('')}
      ${pages.map(page => `
        <url>
          <loc>${baseUrl}${page.path}</loc>
          <lastmod>${page.updatedAt.toISOString()}</lastmod>
          <changefreq>monthly</changefreq>
          <priority>0.5</priority>
        </url>
      `).join('')}
    </urlset>`

  return sitemap
}

export async function checkRedirect(path: string) {
  const redirect = await prisma.redirect.findUnique({
    where: { fromPath: path }
  })

  if (redirect?.active) {
    await prisma.redirect.update({
      where: { id: redirect.id },
      data: { hits: { increment: 1 } }
    })

    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_BASE_URL}${redirect.toPath}`,
      redirect.statusCode
    )
  }

  return null
}

export function generateStructuredData(type: string, data: any) {
  switch (type) {
    case 'product':
      return {
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: data.name,
        description: data.description,
        image: data.images[0]?.url,
        offers: {
          '@type': 'Offer',
          price: data.price,
          priceCurrency: 'EUR',
          availability: data.stock > 0 
            ? 'https://schema.org/InStock'
            : 'https://schema.org/OutOfStock'
        }
      }
    // Weitere strukturierte Datentypen...
    default:
      return null
  }
} 