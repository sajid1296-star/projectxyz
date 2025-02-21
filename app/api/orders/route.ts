import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { sendOrderConfirmation } from '@/lib/email';
import { processPayment } from '@/lib/payment';

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '10');

  try {
    const orders = await prisma.order.findMany({
      where: {
        userId: session.user.id,
        ...(status && { status }),
      },
      include: {
        items: {
          include: {
            product: {
              select: {
                name: true,
                images: true,
              },
            },
          },
        },
        shippingAddress: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
      skip: (page - 1) * limit,
      take: limit,
    });

    const total = await prisma.order.count({
      where: {
        userId: session.user.id,
        ...(status && { status }),
      },
    });

    // Formatiere die Antwort
    const formattedOrders = orders.map((order) => ({
      id: order.id,
      createdAt: order.createdAt,
      status: order.status,
      total: order.total,
      items: order.items.map((item) => ({
        quantity: item.quantity,
        price: item.price,
        product: {
          name: item.product.name,
          images: item.product.images,
        },
      })),
      shippingAddress: order.shippingAddress ? {
        street: order.shippingAddress.street,
        city: order.shippingAddress.city,
        postalCode: order.shippingAddress.postalCode,
        country: order.shippingAddress.country,
      } : null,
      paymentStatus: order.paymentStatus,
    }));

    return NextResponse.json({
      orders: formattedOrders,
      pagination: {
        total,
        pages: Math.ceil(total / limit),
        currentPage: page,
        limit,
      },
    });
  } catch (error) {
    console.error('Orders Error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 });
    }

    const { items, total, shippingAddress, billingAddress, paymentDetails } = await req.json();

    // Zahlungsverarbeitung
    const paymentResult = await processPayment({
      amount: total,
      currency: 'EUR',
      paymentDetails,
    });

    if (!paymentResult.success) {
      return NextResponse.json(
        { error: 'Zahlungsverarbeitung fehlgeschlagen' },
        { status: 400 }
      );
    }

    // Bestellung in der Datenbank erstellen
    const order = await prisma.order.create({
      data: {
        userId: session.user.id,
        total,
        status: 'PENDING',
        paymentIntentId: paymentResult.paymentIntentId,
        shippingAddress: { create: shippingAddress },
        billingAddress: { create: billingAddress },
        items: {
          create: items.map((item: any) => ({
            productId: item.productId,
            variantId: item.variantId,
            quantity: item.quantity,
            price: item.price,
          })),
        },
      },
      include: {
        items: {
          include: {
            product: true,
          },
        },
        shippingAddress: true,
      },
    });

    // Bestellbestätigung per E-Mail senden
    await sendOrderConfirmation({
      to: session.user.email!,
      order,
    });

    return NextResponse.json(order);
  } catch (error) {
    console.error('Order creation error:', error);
    return NextResponse.json(
      { error: 'Interner Server-Fehler' },
      { status: 500 }
    );
  }
} 