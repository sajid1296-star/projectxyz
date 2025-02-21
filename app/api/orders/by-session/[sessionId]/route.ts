import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { stripe } from '@/lib/stripe';

export async function GET(
  request: Request,
  { params }: { params: { sessionId: string } }
) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    // Hole Stripe Session Details
    const stripeSession = await stripe.checkout.sessions.retrieve(
      params.sessionId,
      {
        expand: ['payment_intent'],
      }
    );

    if (!stripeSession) {
      return new NextResponse('Session nicht gefunden', { status: 404 });
    }

    // Hole Bestelldetails aus der Datenbank
    const order = await prisma.order.findFirst({
      where: {
        id: stripeSession.metadata?.orderId,
        userId: session.user.id, // Sicherheitscheck: Nur eigene Bestellungen anzeigen
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
    });

    if (!order) {
      return new NextResponse('Bestellung nicht gefunden', { status: 404 });
    }

    // Formatiere die Antwort
    const formattedOrder = {
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
    };

    return NextResponse.json(formattedOrder);
  } catch (error) {
    console.error('Order Details Error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
} 