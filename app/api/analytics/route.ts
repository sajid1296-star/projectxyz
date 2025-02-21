import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { AnalyticsService } from '@/lib/analytics'
import { rateLimit } from '@/lib/rate-limit'

const analytics = new AnalyticsService()

export async function POST(req: Request) {
  try {
    // Rate Limiting
    const limiter = await rateLimit('analytics_track', {
      max: 100,
      windowMs: 60 * 1000
    })

    const data = await req.json()
    await analytics.trackEvent(data)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Analytics error:', error)
    return NextResponse.json(
      { error: 'Analytics-Fehler' },
      { status: 500 }
    )
  }
}

export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.role === 'ADMIN') {
    return NextResponse.json(
      { error: 'Nicht autorisiert' },
      { status: 401 }
    )
  }

  try {
    const { searchParams } = new URL(req.url)
    const results = await analytics.getAnalytics({
      startDate: new Date(searchParams.get('start')!),
      endDate: new Date(searchParams.get('end')!),
      metrics: searchParams.get('metrics')!.split(','),
      dimensions: searchParams.get('dimensions')?.split(','),
      filters: JSON.parse(searchParams.get('filters') || '{}'),
      groupBy: searchParams.get('groupBy')?.split(',')
    })

    return NextResponse.json(results)
  } catch (error) {
    console.error('Analytics error:', error)
    return NextResponse.json(
      { error: 'Analytics-Fehler' },
      { status: 500 }
    )
  }
} 