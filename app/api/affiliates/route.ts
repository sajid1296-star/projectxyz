import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { AffiliateService } from '@/lib/affiliates'

const affiliateService = new AffiliateService()

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json(
      { error: 'Nicht autorisiert' },
      { status: 401 }
    )
  }

  try {
    const data = await req.json()
    const affiliate = await affiliateService.createAffiliate(
      session.user.id,
      data
    )

    return NextResponse.json(affiliate)
  } catch (error) {
    console.error('Affiliate error:', error)
    return NextResponse.json(
      { error: 'Interner Server-Fehler' },
      { status: 500 }
    )
  }
}

export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json(
      { error: 'Nicht autorisiert' },
      { status: 401 }
    )
  }

  try {
    const affiliate = await prisma.affiliate.findUnique({
      where: { userId: session.user.id },
      include: {
        referrals: {
          include: { order: true },
          orderBy: { createdAt: 'desc' }
        },
        payouts: {
          orderBy: { createdAt: 'desc' }
        }
      }
    })

    return NextResponse.json(affiliate)
  } catch (error) {
    console.error('Affiliate error:', error)
    return NextResponse.json(
      { error: 'Interner Server-Fehler' },
      { status: 500 }
    )
  }
} 