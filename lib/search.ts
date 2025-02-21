import { Client } from '@elastic/elasticsearch'
import { createHash } from 'crypto'
import { prisma } from './prisma'
import { CacheManager } from './cache'

const elastic = new Client({ node: process.env.ELASTICSEARCH_URL })
const cache = CacheManager.getInstance()

interface SearchParams {
  query: string
  filters?: Record<string, any>
  sort?: string
  page?: number
  limit?: number
}

export class SearchEngine {
  async search(params: SearchParams) {
    const cacheKey = this.generateCacheKey(params)
    const cached = await cache.get(cacheKey, 'QUERY')
    if (cached) return cached

    const { query, filters, sort, page = 1, limit = 24 } = params

    // Erstelle Elasticsearch Query
    const body = {
      from: (page - 1) * limit,
      size: limit,
      query: {
        bool: {
          must: [
            {
              multi_match: {
                query,
                fields: ['name^3', 'description', 'brand', 'categories'],
                fuzziness: 'AUTO'
              }
            }
          ],
          filter: this.buildFilters(filters)
        }
      },
      sort: this.buildSort(sort),
      aggs: this.buildAggregations()
    }

    // Führe Suche aus
    const results = await elastic.search({
      index: 'products',
      body
    })

    // Transformiere Ergebnisse
    const products = await this.hydrateResults(results.hits.hits)
    const facets = this.transformAggregations(results.aggregations)

    const response = {
      products,
      facets,
      total: results.hits.total.value,
      page,
      pages: Math.ceil(results.hits.total.value / limit)
    }

    // Cache Ergebnisse
    await cache.set(cacheKey, response, 'QUERY', 3600)

    return response
  }

  private generateCacheKey(params: SearchParams): string {
    return createHash('md5')
      .update(JSON.stringify(params))
      .digest('hex')
  }

  private buildFilters(filters?: Record<string, any>) {
    if (!filters) return []

    return Object.entries(filters).map(([key, value]) => {
      switch (key) {
        case 'price':
          return {
            range: {
              price: {
                gte: value[0],
                lte: value[1]
              }
            }
          }
        case 'rating':
          return {
            range: {
              rating: {
                gte: value
              }
            }
          }
        case 'categories':
        case 'brands':
          return {
            terms: {
              [key]: Array.isArray(value) ? value : [value]
            }
          }
        default:
          return {
            term: {
              [`attributes.${key}`]: value
            }
          }
      }
    })
  }

  private buildSort(sort?: string) {
    if (!sort) return [{ _score: 'desc' }]

    const [field, order] = sort.split(':')
    return [
      { [field]: { order } },
      { _score: 'desc' }
    ]
  }

  private buildAggregations() {
    return {
      price_ranges: {
        range: {
          field: 'price',
          ranges: [
            { to: 50 },
            { from: 50, to: 100 },
            { from: 100, to: 200 },
            { from: 200 }
          ]
        }
      },
      categories: {
        terms: { field: 'categories', size: 50 }
      },
      brands: {
        terms: { field: 'brand', size: 50 }
      },
      ratings: {
        terms: { field: 'rating', size: 5 }
      },
      attributes: {
        nested: { path: 'attributes' },
        aggs: {
          keys: {
            terms: { field: 'attributes.key' },
            aggs: {
              values: {
                terms: { field: 'attributes.value' }
              }
            }
          }
        }
      }
    }
  }

  private async hydrateResults(hits: any[]) {
    const ids = hits.map(hit => hit._id)
    
    const products = await prisma.product.findMany({
      where: { id: { in: ids } },
      include: {
        images: true,
        category: true,
        brand: true,
        variants: true
      }
    })

    // Behalte Elasticsearch Reihenfolge bei
    return ids.map(id => 
      products.find(p => p.id === id)
    )
  }

  private transformAggregations(aggs: any) {
    return {
      prices: aggs.price_ranges.buckets.map((bucket: any) => ({
        range: [bucket.from || 0, bucket.to || Infinity],
        count: bucket.doc_count
      })),
      categories: aggs.categories.buckets.map((bucket: any) => ({
        value: bucket.key,
        count: bucket.doc_count
      })),
      brands: aggs.brands.buckets.map((bucket: any) => ({
        value: bucket.key,
        count: bucket.doc_count
      })),
      ratings: aggs.ratings.buckets.map((bucket: any) => ({
        value: bucket.key,
        count: bucket.doc_count
      })),
      attributes: aggs.attributes.keys.buckets.map((bucket: any) => ({
        key: bucket.key,
        values: bucket.values.buckets.map((value: any) => ({
          value: value.key,
          count: value.doc_count
        }))
      }))
    }
  }
} 