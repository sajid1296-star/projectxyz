import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(
  request: Request,
  { params }: { params: { productId: string } }
) {
  try {
    // Produkt mit allen relevanten Informationen abrufen
    const product = await prisma.product.findUnique({
      where: { id: params.productId },
      include: {
        images: {
          select: {
            id: true,
            url: true
          }
        },
        brand: {
          select: {
            id: true,
            name: true
          }
        },
        category: {
          select: {
            id: true,
            name: true
          }
        },
        reviews: {
          select: {
            rating: true
          }
        }
      }
    });

    if (!product) {
      return new NextResponse('Produkt nicht gefunden', { status: 404 });
    }

    // Bewertungsverteilung berechnen
    const ratingDistribution = product.reviews.reduce((acc, review) => {
      acc[review.rating] = (acc[review.rating] || 0) + 1;
      return acc;
    }, {} as Record<number, number>);

    // Durchschnittliche Bewertung berechnen
    const averageRating = product.reviews.length > 0
      ? product.reviews.reduce((sum, review) => sum + review.rating, 0) / product.reviews.length
      : 0;

    // Produkt für die Response aufbereiten
    const formattedProduct = {
      id: product.id,
      name: product.name,
      description: product.description,
      price: product.price,
      stock: product.stock,
      images: product.images,
      specifications: product.specifications,
      brand: product.brand,
      category: product.category,
      averageRating,
      totalReviews: product.reviews.length,
      ratingDistribution,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt
    };

    return NextResponse.json(formattedProduct);
  } catch (error) {
    console.error('Product Fetch Error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { productId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const body = await request.json();
    const {
      name,
      description,
      price,
      stock,
      specifications,
      brandId,
      categoryId,
      images
    } = body;

    // Validierung der Eingaben
    if (price && typeof price !== 'number' || price < 0) {
      return new NextResponse('Ungültiger Preis', { status: 400 });
    }

    if (stock && typeof stock !== 'number' || stock < 0) {
      return new NextResponse('Ungültiger Lagerbestand', { status: 400 });
    }

    // Produkt aktualisieren
    const updatedProduct = await prisma.product.update({
      where: { id: params.productId },
      data: {
        ...(name && { name }),
        ...(description && { description }),
        ...(price && { price }),
        ...(stock !== undefined && { stock }),
        ...(specifications && { specifications }),
        ...(brandId && { brandId }),
        ...(categoryId && { categoryId })
      },
      include: {
        images: true,
        brand: true,
        category: true
      }
    });

    // Bilder aktualisieren, falls neue hinzugefügt wurden
    if (images && Array.isArray(images)) {
      // Bestehende Bilder löschen
      await prisma.image.deleteMany({
        where: { productId: params.productId }
      });

      // Neue Bilder hinzufügen
      await prisma.image.createMany({
        data: images.map(url => ({
          url,
          productId: params.productId
        }))
      });
    }

    return NextResponse.json(updatedProduct);
  } catch (error) {
    console.error('Product Update Error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { productId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    // Prüfen, ob das Produkt in aktiven Bestellungen verwendet wird
    const activeOrders = await prisma.orderItem.findFirst({
      where: {
        productId: params.productId,
        order: {
          status: {
            in: ['pending', 'processing', 'shipped']
          }
        }
      }
    });

    if (activeOrders) {
      return new NextResponse(
        'Produkt kann nicht gelöscht werden, da es in aktiven Bestellungen verwendet wird',
        { status: 400 }
      );
    }

    // Produkt und zugehörige Daten löschen
    await prisma.$transaction([
      // Bewertungen löschen
      prisma.review.deleteMany({
        where: { productId: params.productId }
      }),
      // Bilder löschen
      prisma.image.deleteMany({
        where: { productId: params.productId }
      }),
      // Produkt löschen
      prisma.product.delete({
        where: { id: params.productId }
      })
    ]);

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('Product Delete Error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
} 