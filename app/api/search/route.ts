import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { SearchService } from '@/lib/search'
import { rateLimit } from '@/lib/rate-limit'

const search = new SearchService()

export async function GET(req: Request) {
  try {
    // Rate Limiting
    const limiter = await rateLimit('search', {
      max: 60,
      windowMs: 60 * 1000
    })

    const { searchParams } = new URL(req.url)
    const session = await getServerSession(authOptions)

    const results = await search.search({
      term: searchParams.get('q') || '',
      filters: JSON.parse(searchParams.get('filters') || '{}'),
      sort: JSON.parse(searchParams.get('sort') || '{}'),
      page: parseInt(searchParams.get('page') || '1'),
      limit: parseInt(searchParams.get('limit') || '20'),
      engine: searchParams.get('engine') as any,
      type: searchParams.get('type') as any,
      language: session?.user?.language || 'en',
      semantic: searchParams.get('semantic') === 'true'
    })

    return NextResponse.json(results)
  } catch (error) {
    console.error('Search error:', error)
    return NextResponse.json(
      { error: 'Suchfehler' },
      { status: 500 }
    )
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.role === 'ADMIN') {
    return NextResponse.json(
      { error: 'Nicht autorisiert' },
      { status: 401 }
    )
  }

  try {
    const document = await req.json()
    await search.index(document)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Indexing error:', error)
    return NextResponse.json(
      { error: 'Indexierungsfehler' },
      { status: 500 }
    )
  }
} 