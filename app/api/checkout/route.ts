import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const body = await request.json();
    const { items, shippingAddress, shippingMethod } = body;

    if (!items?.length || !shippingAddress || !shippingMethod) {
      return new NextResponse('Ungültige Anfrage', { status: 400 });
    }

    // Produkte aus der Datenbank abrufen um aktuelle Preise zu verwenden
    const productIds = items.map((item: any) => item.id);
    const products = await prisma.product.findMany({
      where: {
        id: { in: productIds }
      }
    });

    // Prüfen ob alle Produkte verfügbar sind
    const unavailableProducts = products.filter(product => {
      const orderItem = items.find((item: any) => item.id === product.id);
      return product.stock < (orderItem?.quantity || 0);
    });

    if (unavailableProducts.length > 0) {
      return new NextResponse(
        `Einige Produkte sind nicht mehr verfügbar: ${
          unavailableProducts.map(p => p.name).join(', ')
        }`,
        { status: 400 }
      );
    }

    // Stripe Line Items erstellen
    const lineItems = products.map(product => {
      const orderItem = items.find((item: any) => item.id === product.id);
      return {
        price_data: {
          currency: 'eur',
          product_data: {
            name: product.name,
            images: product.images.map((image: any) => image.url),
          },
          unit_amount: product.price * 100, // Cent
        },
        quantity: orderItem?.quantity || 0,
      };
    });

    // Versandkosten hinzufügen
    const shippingCost = shippingMethod === 'standard' ? 499 : 999; // Cent
    lineItems.push({
      price_data: {
        currency: 'eur',
        product_data: {
          name: `${shippingMethod === 'standard' ? 'Standard' : 'Express'} Versand`,
        },
        unit_amount: shippingCost,
      },
      quantity: 1,
    });

    // Stripe Checkout Session erstellen
    const stripeSession = await stripe.checkout.sessions.create({
      customer_email: session.user.email!,
      line_items: lineItems,
      mode: 'payment',
      success_url: `${process.env.NEXTAUTH_URL}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXTAUTH_URL}/checkout?canceled=true`,
      metadata: {
        userId: session.user.id,
        shippingAddress: JSON.stringify(shippingAddress),
        shippingMethod,
      },
    });

    // Bestellung in der Datenbank erstellen
    const order = await prisma.order.create({
      data: {
        userId: session.user.id,
        status: 'pending',
        total: stripeSession.amount_total! / 100, // Von Cent in Euro
        shippingAddress: shippingAddress,
        shippingMethod: shippingMethod,
        stripeSessionId: stripeSession.id,
        items: {
          create: items.map((item: any) => ({
            productId: item.id,
            quantity: item.quantity,
            price: products.find(p => p.id === item.id)?.price || 0,
          })),
        },
      },
    });

    return NextResponse.json({
      sessionId: stripeSession.id,
      orderId: order.id,
    });
  } catch (error) {
    console.error('Checkout Error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
} 