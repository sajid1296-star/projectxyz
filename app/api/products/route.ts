import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Pagination
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '12');
    const skip = (page - 1) * limit;

    // Filter
    const search = searchParams.get('search') || '';
    const category = searchParams.get('category');
    const brand = searchParams.get('brand');
    const minPrice = parseFloat(searchParams.get('minPrice') || '0');
    const maxPrice = parseFloat(searchParams.get('maxPrice') || '999999');
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';
    const inStock = searchParams.get('inStock') === 'true';

    // Basis-Query erstellen
    const where = {
      AND: [
        {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { description: { contains: search, mode: 'insensitive' } }
          ]
        },
        { price: { gte: minPrice, lte: maxPrice } },
        ...(category ? [{ categoryId: category }] : []),
        ...(brand ? [{ brandId: brand }] : []),
        ...(inStock ? [{ stock: { gt: 0 } }] : [])
      ]
    };

    // Sortierung konfigurieren
    const orderBy: any = {};
    switch (sortBy) {
      case 'price':
        orderBy.price = sortOrder;
        break;
      case 'name':
        orderBy.name = sortOrder;
        break;
      case 'rating':
        orderBy.averageRating = sortOrder;
        break;
      default:
        orderBy.createdAt = sortOrder;
    }

    // Produkte und Gesamtanzahl parallel abfragen
    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
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
        },
        orderBy,
        skip,
        take: limit
      }),
      prisma.product.count({ where })
    ]);

    // Bewertungen für jedes Produkt berechnen
    const formattedProducts = products.map(product => {
      const averageRating = product.reviews.length > 0
        ? product.reviews.reduce((sum, review) => sum + review.rating, 0) / product.reviews.length
        : 0;

      return {
        ...product,
        averageRating,
        totalReviews: product.reviews.length,
        reviews: undefined // Reviews aus der Response entfernen
      };
    });

    // Filter-Optionen abrufen
    const [categories, brands, priceRange] = await Promise.all([
      prisma.category.findMany({
        select: {
          id: true,
          name: true,
          _count: {
            select: { products: true }
          }
        }
      }),
      prisma.brand.findMany({
        select: {
          id: true,
          name: true,
          _count: {
            select: { products: true }
          }
        }
      }),
      prisma.product.aggregate({
        _min: { price: true },
        _max: { price: true }
      })
    ]);

    return NextResponse.json({
      products: formattedProducts,
      pagination: {
        total,
        pages: Math.ceil(total / limit),
        currentPage: page,
        limit
      },
      filters: {
        categories: categories.map(c => ({
          id: c.id,
          name: c.name,
          count: c._count.products
        })),
        brands: brands.map(b => ({
          id: b.id,
          name: b.name,
          count: b._count.products
        })),
        priceRange: {
          min: priceRange._min.price || 0,
          max: priceRange._max.price || 0
        }
      }
    });
  } catch (error) {
    console.error('Products Fetch Error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

export async function POST(request: Request) {
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

    // Validierung
    if (!name || !price || !brandId || !categoryId) {
      return new NextResponse('Fehlende Pflichtfelder', { status: 400 });
    }

    if (typeof price !== 'number' || price < 0) {
      return new NextResponse('Ungültiger Preis', { status: 400 });
    }

    if (typeof stock !== 'number' || stock < 0) {
      return new NextResponse('Ungültiger Lagerbestand', { status: 400 });
    }

    // Produkt erstellen
    const product = await prisma.product.create({
      data: {
        name,
        description,
        price,
        stock,
        specifications: specifications || {},
        brandId,
        categoryId,
        images: images && Array.isArray(images) ? {
          create: images.map(url => ({ url }))
        } : undefined
      },
      include: {
        images: true,
        brand: true,
        category: true
      }
    });

    return NextResponse.json(product);
  } catch (error) {
    console.error('Product Creation Error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
} 