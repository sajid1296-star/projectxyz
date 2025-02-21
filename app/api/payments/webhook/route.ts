import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import Stripe from 'stripe'
import { prisma } from '@/lib/prisma'
import { PaymentService } from '@/lib/payments'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

export async function POST(req: Request) {
  try {
    const body = await req.text()
    const signature = headers().get('stripe-signature')!

    // Verifiziere Webhook
    const event = stripe.webhooks.constructEvent(
      body,
      signature,
      webhookSecret
    )

    const paymentService = new PaymentService()

    // Verarbeite verschiedene Event-Typen
    switch (event.type) {
      case 'payment_intent.succeeded':
        const paymentIntent = event.data.object
        await handleSuccessfulPayment(paymentIntent)
        break

      case 'payment_intent.payment_failed':
        const failedPayment = event.data.object
        await handleFailedPayment(failedPayment)
        break

      // Weitere Event-Typen...
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 400 }
    )
  }
}

async function handleSuccessfulPayment(paymentIntent: Stripe.PaymentIntent) {
  const { orderId, paymentId } = paymentIntent.metadata

  await prisma.payment.update({
    where: { id: paymentId },
    data: {
      status: 'COMPLETED',
      metadata: {
        stripePaymentIntent: paymentIntent.id,
        stripePaymentMethod: paymentIntent.payment_method
      }
    }
  })

  await prisma.order.update({
    where: { id: orderId },
    data: { status: 'PAID' }
  })
}

async function handleFailedPayment(paymentIntent: Stripe.PaymentIntent) {
  const { paymentId } = paymentIntent.metadata

  await prisma.payment.update({
    where: { id: paymentId },
    data: {
      status: 'FAILED',
      errorMessage: paymentIntent.last_payment_error?.message
    }
  })
} 