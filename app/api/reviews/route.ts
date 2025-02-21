import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { checkPurchase, notifyModerators } from '@/lib/reviews'

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Nicht authentifiziert' },
        { status: 401 }
      )
    }

    const { productId, rating, title, content, orderId } = await req.json()

    // Prüfen, ob der Benutzer das Produkt gekauft hat
    if (!(await checkPurchase(session.user.id, productId))) {
      return NextResponse.json(
        { error: 'Produkt muss zuerst gekauft werden' },
        { status: 403 }
      )
    }

    // Review erstellen
    const review = await prisma.review.create({
      data: {
        rating,
        title,
        content,
        userId: session.user.id,
        productId,
        orderId,
        status: session.user.role === 'ADMIN' ? 'APPROVED' : 'PENDING'
      },
      include: {
        user: {
          select: {
            name: true,
            image: true
          }
        }
      }
    })

    // Moderatoren benachrichtigen bei neuen Reviews
    if (review.status === 'PENDING') {
      await notifyModerators(review)
    }

    return NextResponse.json(review)
  } catch (error) {
    console.error('Review creation error:', error)
    return NextResponse.json(
      { error: 'Interner Server-Fehler' },
      { status: 500 }
    )
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const productId = searchParams.get('productId')
  const status = searchParams.get('status') || 'APPROVED'

  const reviews = await prisma.review.findMany({
    where: {
      productId,
      status: status as ReviewStatus
    },
    include: {
      user: {
        select: {
          name: true,
          image: true
        }
      },
      _count: {
        select: {
          comments: true
        }
      }
    },
    orderBy: {
      createdAt: 'desc'
    }
  })

  return NextResponse.json(reviews)
} 