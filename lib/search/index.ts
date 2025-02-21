import { Redis } from 'ioredis'
import { prisma } from '../prisma'
import { LoggingService } from '../logger'
import { PerformanceService } from '../performance'
import { QueueService } from '../queue'
import { Client as Elasticsearch } from '@elastic/elasticsearch'
import { MeiliSearch } from 'meilisearch'
import { Algolia } from 'algoliasearch'
import { OpenAI } from 'openai'
import { Vector } from '@pinecone-database/pinecone'
import { createHash } from 'crypto'

const logger = new LoggerService()
const performance = new PerformanceService()
const queue = new QueueService()
const redis = new Redis(process.env.REDIS_URL!)

// Search Engines
const elasticsearch = new Elasticsearch({
  node: process.env.ELASTICSEARCH_URL
})
const meilisearch = new MeiliSearch({
  host: process.env.MEILISEARCH_URL!
})
const algolia = Algolia(
  process.env.ALGOLIA_APP_ID!,
  process.env.ALGOLIA_API_KEY!
)
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})
const pinecone = new Vector(process.env.PINECONE_API_KEY!)

export class SearchService {
  async search(query: {
    term: string
    filters?: Record<string, any>
    sort?: Record<string, 'asc' | 'desc'>
    page?: number
    limit?: number
    engine?: 'elasticsearch' | 'meilisearch' | 'algolia'
    type?: 'text' | 'vector' | 'hybrid'
    language?: string
    semantic?: boolean
  }) {
    try {
      const {
        term,
        filters = {},
        sort = {},
        page = 1,
        limit = 20,
        engine = 'elasticsearch',
        type = 'text',
        language = 'en',
        semantic = false
      } = query

      // Cache-Key generieren
      const cacheKey = this.generateCacheKey(query)

      // Cache prüfen
      const cached = await redis.get(cacheKey)
      if (cached) return JSON.parse(cached)

      let results

      // Vector Search
      if (type === 'vector' || type === 'hybrid') {
        const embedding = await this.generateEmbedding(term)
        const vectorResults = await this.vectorSearch(
          embedding,
          filters,
          limit
        )
        
        if (type === 'vector') {
          results = vectorResults
        } else {
          // Hybrid Search
          const textResults = await this.textSearch(
            term,
            engine,
            filters,
            sort,
            page,
            limit
          )
          results = await this.hybridRanking(
            vectorResults,
            textResults
          )
        }
      } else {
        // Text Search
        results = await this.textSearch(
          term,
          engine,
          filters,
          sort,
          page,
          limit
        )
      }

      // Semantic Search
      if (semantic) {
        results = await this.semanticEnrichment(
          results,
          term,
          language
        )
      }

      // Facetten generieren
      const facets = await this.generateFacets(results)

      // Suggestions generieren
      const suggestions = await this.generateSuggestions(
        term,
        results
      )

      // Analytics aktualisieren
      await this.updateSearchAnalytics(query, results)

      const response = {
        results,
        facets,
        suggestions,
        total: results.length,
        page,
        limit
      }

      // Cache setzen (5 Minuten)
      await redis.set(
        cacheKey,
        JSON.stringify(response),
        'EX',
        300
      )

      return response
    } catch (error) {
      logger.log('error', 'Search failed', { error })
      throw error
    }
  }

  async index(document: {
    id: string
    type: string
    data: any
    language?: string
  }) {
    try {
      const { id, type, data, language = 'en' } = document

      // Text Indexierung
      await Promise.all([
        // Elasticsearch
        elasticsearch.index({
          index: type,
          id,
          body: data
        }),
        // MeiliSearch
        meilisearch
          .index(type)
          .addDocuments([{ id, ...data }]),
        // Algolia
        algolia
          .initIndex(type)
          .saveObject({ objectID: id, ...data })
      ])

      // Vector Indexierung
      if (data.content) {
        const embedding = await this.generateEmbedding(
          data.content
        )
        await pinecone.upsert({
          id,
          values: embedding,
          metadata: data
        })
      }

      // Search Analytics
      await prisma.searchDocument.create({
        data: {
          documentId: id,
          type,
          language,
          indexedAt: new Date()
        }
      })

      // Cache invalidieren
      await this.invalidateCache(type)
    } catch (error) {
      logger.log('error', 'Indexing failed', { error })
      throw error
    }
  }

  private async textSearch(
    term: string,
    engine: string,
    filters: any,
    sort: any,
    page: number,
    limit: number
  ) {
    switch (engine) {
      case 'elasticsearch':
        const { body } = await elasticsearch.search({
          query: {
            multi_match: {
              query: term,
              fields: ['title^2', 'content']
            }
          },
          post_filter: this.buildElasticsearchFilters(filters),
          sort: this.buildElasticsearchSort(sort),
          from: (page - 1) * limit,
          size: limit
        })
        return body.hits.hits.map((hit: any) => ({
          ...hit._source,
          score: hit._score
        }))

      case 'meilisearch':
        return meilisearch
          .index(filters.type)
          .search(term, {
            filter: this.buildMeilisearchFilters(filters),
            sort: this.buildMeilisearchSort(sort),
            limit,
            offset: (page - 1) * limit
          })

      case 'algolia':
        return algolia
          .initIndex(filters.type)
          .search(term, {
            filters: this.buildAlgoliaFilters(filters),
            page: page - 1,
            hitsPerPage: limit
          })

      default:
        throw new Error(`Unknown search engine: ${engine}`)
    }
  }

  private async vectorSearch(
    embedding: number[],
    filters: any,
    limit: number
  ) {
    const results = await pinecone.query({
      vector: embedding,
      filter: filters,
      topK: limit
    })
    return results.matches.map(match => ({
      ...match.metadata,
      score: match.score
    }))
  }

  private async hybridRanking(
    vectorResults: any[],
    textResults: any[]
  ) {
    // Hybrid Ranking Logik implementieren
    return []
  }

  private async semanticEnrichment(
    results: any[],
    query: string,
    language: string
  ) {
    const enriched = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [{
        role: 'system',
        content: 'Enrich these search results semantically.'
      }, {
        role: 'user',
        content: JSON.stringify({ results, query })
      }]
    })

    return JSON.parse(enriched.choices[0].message.content!)
  }

  private async generateEmbedding(text: string) {
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: text
    })
    return response.data[0].embedding
  }

  private async generateFacets(results: any[]) {
    // Facetten-Generierung implementieren
    return {}
  }

  private async generateSuggestions(
    term: string,
    results: any[]
  ) {
    // Suggestions-Generierung implementieren
    return []
  }

  private generateCacheKey(query: any): string {
    return createHash('md5')
      .update(JSON.stringify(query))
      .digest('hex')
  }

  private async invalidateCache(type: string) {
    const keys = await redis.keys(`search:${type}:*`)
    if (keys.length > 0) {
      await redis.del(...keys)
    }
  }

  private async updateSearchAnalytics(
    query: any,
    results: any[]
  ) {
    await prisma.searchQuery.create({
      data: {
        term: query.term,
        filters: query.filters,
        resultCount: results.length,
        timestamp: new Date()
      }
    })
  }

  private buildElasticsearchFilters(filters: any) {
    // Filter-Konvertierung für Elasticsearch
    return {}
  }

  private buildMeilisearchFilters(filters: any) {
    // Filter-Konvertierung für Meilisearch
    return []
  }

  private buildAlgoliaFilters(filters: any) {
    // Filter-Konvertierung für Algolia
    return ''
  }

  private buildElasticsearchSort(sort: any) {
    // Sort-Konvertierung für Elasticsearch
    return []
  }

  private buildMeilisearchSort(sort: any) {
    // Sort-Konvertierung für Meilisearch
    return []
  }
} 