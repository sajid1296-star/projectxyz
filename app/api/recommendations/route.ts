import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { RecommendationEngine } from '@/lib/recommendations'

const engine = new RecommendationEngine()

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const type = searchParams.get('type')
    const id = searchParams.get('id')
    const limit = parseInt(searchParams.get('limit') || '10')

    if (!type || !id) {
      return NextResponse.json(
        { error: 'Typ und ID erforderlich' },
        { status: 400 }
      )
    }

    let recommendations
    switch (type) {
      case 'similar':
        recommendations = await engine.getSimilarProducts(id, limit)
        break
      case 'personal':
        recommendations = await engine.getPersonalizedRecommendations(id, limit)
        break
      case 'trending':
        recommendations = await engine.getTrendingProducts(limit)
        break
      default:
        return NextResponse.json(
          { error: 'Ungültiger Empfehlungstyp' },
          { status: 400 }
        )
    }

    return NextResponse.json(recommendations)
  } catch (error) {
    console.error('Recommendation error:', error)
    return NextResponse.json(
      { error: 'Interner Server-Fehler' },
      { status: 500 }
    )
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json(
      { error: 'Nicht autorisiert' },
      { status: 401 }
    )
  }

  try {
    const { productId, type, metadata } = await req.json()

    await engine.trackBehavior(
      session.user.id,
      productId,
      type,
      metadata
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Tracking error:', error)
    return NextResponse.json(
      { error: 'Interner Server-Fehler' },
      { status: 500 }
    )
  }
} 