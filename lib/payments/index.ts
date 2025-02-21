import Stripe from 'stripe'
import { PayPalClient } from '@paypal/checkout-server-sdk'
import { prisma } from '../prisma'
import { sendEmail } from '../email'
import { createInvoice } from '../invoices'

// Provider-Konfigurationen
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
const paypal = new PayPalClient(process.env.PAYPAL_CLIENT_ID!)

export class PaymentService {
  async processPayment(
    orderId: string,
    amount: number,
    currency: string,
    method: PaymentMethod,
    metadata?: any
  ) {
    try {
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: { user: true }
      })

      if (!order) throw new Error('Bestellung nicht gefunden')

      // Erstelle Payment-Record
      const payment = await prisma.payment.create({
        data: {
          orderId,
          amount,
          currency,
          provider: method.provider,
          status: 'PENDING',
          method: method.type,
          metadata
        }
      })

      // Verarbeite Zahlung je nach Provider
      let result
      switch (method.provider) {
        case 'STRIPE':
          result = await this.processStripePayment(
            payment,
            order,
            method
          )
          break
        case 'PAYPAL':
          result = await this.processPayPalPayment(
            payment,
            order,
            method
          )
          break
        // Weitere Provider...
        default:
          throw new Error('Nicht unterstützter Zahlungsanbieter')
      }

      // Aktualisiere Payment-Status
      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: 'COMPLETED',
          intentId: result.id,
          metadata: result
        }
      })

      // Nachbearbeitung
      await this.handleSuccessfulPayment(order, payment)

      return { success: true, paymentId: payment.id }
    } catch (error) {
      console.error('Payment error:', error)
      
      // Fehlerbehandlung
      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: 'FAILED',
          errorMessage: error.message
        }
      })

      throw error
    }
  }

  private async processStripePayment(
    payment: Payment,
    order: Order,
    method: PaymentMethod
  ) {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(payment.amount * 100), // Cent
      currency: payment.currency,
      customer: order.user.stripeCustomerId,
      payment_method: method.tokenId,
      confirm: true,
      return_url: `${process.env.NEXT_PUBLIC_BASE_URL}/checkout/complete`,
      metadata: {
        orderId: order.id,
        paymentId: payment.id
      }
    })

    return paymentIntent
  }

  private async processPayPalPayment(
    payment: Payment,
    order: Order,
    method: PaymentMethod
  ) {
    const request = new paypal.orders.OrdersCreateRequest()
    request.prefer("return=representation")
    request.requestBody({
      intent: 'CAPTURE',
      purchase_units: [{
        amount: {
          currency_code: payment.currency,
          value: payment.amount.toString()
        },
        reference_id: payment.id
      }]
    })

    const response = await paypal.execute(request)
    return response.result
  }

  private async handleSuccessfulPayment(
    order: Order,
    payment: Payment
  ) {
    // Aktualisiere Bestellstatus
    await prisma.order.update({
      where: { id: order.id },
      data: { status: 'PAID' }
    })

    // Erstelle Rechnung
    const invoice = await createInvoice(order, payment)

    // Sende Bestätigungen
    await Promise.all([
      sendEmail({
        to: order.user.email,
        subject: 'Zahlungsbestätigung',
        template: 'payment-confirmation',
        data: { order, payment, invoice }
      }),
      // Weitere Benachrichtigungen...
    ])
  }

  async refundPayment(
    paymentId: string,
    amount?: number,
    reason?: string
  ) {
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: { order: true }
    })

    if (!payment) throw new Error('Zahlung nicht gefunden')

    let refund
    switch (payment.provider) {
      case 'STRIPE':
        refund = await stripe.refunds.create({
          payment_intent: payment.intentId!,
          amount: amount ? Math.round(amount * 100) : undefined,
          reason: reason as any
        })
        break
      // Weitere Provider...
    }

    await prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: 'REFUNDED',
        refundId: refund.id,
        metadata: {
          ...payment.metadata,
          refund
        }
      }
    })

    return refund
  }
} 