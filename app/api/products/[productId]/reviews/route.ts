import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function POST(
  request: Request,
  { params }: { params: { productId: string } }
) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    const body = await request.json();
    const { rating, comment } = body;

    // Validierung
    if (!rating || rating < 1 || rating > 5) {
      return new NextResponse('Ungültige Bewertung', { status: 400 });
    }

    // Prüfen, ob der Benutzer das Produkt gekauft hat
    const hasPurchased = await prisma.orderItem.findFirst({
      where: {
        productId: params.productId,
        order: {
          userId: session.user.id,
          status: 'completed'
        }
      }
    });

    if (!hasPurchased) {
      return new NextResponse(
        'Sie müssen das Produkt gekauft haben, um es bewerten zu können',
        { status: 403 }
      );
    }

    // Prüfen, ob bereits eine Bewertung existiert
    const existingReview = await prisma.review.findFirst({
      where: {
        productId: params.productId,
        userId: session.user.id
      }
    });

    if (existingReview) {
      return new NextResponse(
        'Sie haben dieses Produkt bereits bewertet',
        { status: 400 }
      );
    }

    // Bewertung erstellen
    const review = await prisma.review.create({
      data: {
        rating,
        comment,
        productId: params.productId,
        userId: session.user.id
      }
    });

    // Durchschnittsbewertung aktualisieren
    const averageRating = await prisma.review.aggregate({
      where: { productId: params.productId },
      _avg: { rating: true },
      _count: true
    });

    await prisma.product.update({
      where: { id: params.productId },
      data: {
        averageRating: averageRating._avg.rating || 0,
        totalReviews: averageRating._count
      }
    });

    return NextResponse.json(review);
  } catch (error) {
    console.error('Review Creation Error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

export async function GET(
  request: Request,
  { params }: { params: { productId: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = 10;
    const skip = (page - 1) * limit;

    const [reviews, total] = await Promise.all([
      prisma.review.findMany({
        where: { productId: params.productId },
        include: {
          user: {
            select: {
              name: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.review.count({
        where: { productId: params.productId }
      })
    ]);

    return NextResponse.json({
      reviews,
      pagination: {
        total,
        pages: Math.ceil(total / limit),
        currentPage: page,
        limit
      }
    });
  } catch (error) {
    console.error('Reviews Fetch Error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
} 