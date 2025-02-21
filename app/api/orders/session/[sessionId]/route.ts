import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

export async function GET(
  request: Request,
  { params }: { params: { sessionId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    // Bestellung anhand der Stripe Session ID finden
    const order = await prisma.order.findFirst({
      where: {
        stripeSessionId: params.sessionId,
        userId: session.user.id
      },
      include: {
        items: {
          include: {
            product: {
              select: {
                name: true
              }
            }
          }
        }
      }
    });

    if (!order) {
      return new NextResponse('Bestellung nicht gefunden', { status: 404 });
    }

    // Stripe Session Status überprüfen
    const stripeSession = await stripe.checkout.sessions.retrieve(params.sessionId);
    
    if (stripeSession.payment_status !== 'paid') {
      return new NextResponse('Zahlung nicht abgeschlossen', { status: 400 });
    }

    // Bestellung für die Response aufbereiten
    const formattedOrder = {
      id: order.id,
      createdAt: order.createdAt,
      total: order.total,
      status: order.status,
      shippingAddress: order.shippingAddress,
      shippingMethod: order.shippingMethod,
      items: order.items.map(item => ({
        name: item.product.name,
        quantity: item.quantity,
        price: item.price
      }))
    };

    return NextResponse.json(formattedOrder);
  } catch (error) {
    console.error('Order Details Error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

// Webhook Handler für Stripe Events
export async function POST(request: Request) {
  try {
    const body = await request.text();
    const signature = request.headers.get('stripe-signature')!;

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(
        body,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET!
      );
    } catch (err) {
      return new NextResponse('Webhook Error', { status: 400 });
    }

    const session = event.data.object as Stripe.Checkout.Session;

    if (event.type === 'checkout.session.completed') {
      // Bestellung aktualisieren
      await prisma.order.update({
        where: {
          stripeSessionId: session.id
        },
        data: {
          status: 'confirmed',
          paymentIntentId: session.payment_intent as string
        }
      });

      // Lagerbestand aktualisieren
      const order = await prisma.order.findUnique({
        where: { stripeSessionId: session.id },
        include: { items: true }
      });

      if (order) {
        for (const item of order.items) {
          await prisma.product.update({
            where: { id: item.productId },
            data: {
              stock: {
                decrement: item.quantity
              }
            }
          });
        }
      }
    }

    return new NextResponse(null, { status: 200 });
  } catch (error) {
    console.error('Webhook Error:', error);
    return new NextResponse('Webhook Error', { status: 500 });
  }
} 