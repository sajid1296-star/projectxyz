import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import prisma from '@/lib/prisma';
import { logger } from '@/lib/logger';

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(request: Request) {
  try {
    const body = await request.text();
    const signature = headers().get('stripe-signature')!;

    let event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err: any) {
      logger.error(`Webhook signature verification failed: ${err.message}`, 'stripe-webhook');
      return new NextResponse(`Webhook Error: ${err.message}`, { status: 400 });
    }

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as any;
        const orderId = session.metadata.orderId;

        // Aktualisiere Bestellstatus
        await prisma.order.update({
          where: { id: orderId },
          data: {
            status: 'paid',
            paymentIntentId: session.payment_intent,
            paymentStatus: 'completed',
          },
        });

        // Reduziere Lagerbestand
        const order = await prisma.order.findUnique({
          where: { id: orderId },
          include: { items: true },
        });

        if (order) {
          for (const item of order.items) {
            await prisma.product.update({
              where: { id: item.productId },
              data: {
                stock: {
                  decrement: item.quantity,
                },
              },
            });
          }
        }

        // Erstelle Aktivitätslog
        await prisma.userActivity.create({
          data: {
            userId: order!.userId,
            type: 'order',
            description: `Bestellung ${orderId} erfolgreich bezahlt`,
            metadata: {
              orderId,
              amount: session.amount_total / 100,
            },
          },
        });

        break;
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as any;
        const orderId = paymentIntent.metadata.orderId;

        await prisma.order.update({
          where: { id: orderId },
          data: {
            status: 'failed',
            paymentStatus: 'failed',
          },
        });

        logger.warning(
          `Zahlung fehlgeschlagen für Bestellung ${orderId}`,
          'stripe-webhook',
          { paymentIntentId: paymentIntent.id }
        );

        break;
      }
    }

    return new NextResponse(null, { status: 200 });
  } catch (error: any) {
    logger.error(`Webhook Error: ${error.message}`, 'stripe-webhook');
    return new NextResponse('Webhook Error', { status: 500 });
  }
} 