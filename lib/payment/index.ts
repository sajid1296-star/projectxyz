import Stripe from 'stripe'
import { PayPal } from '@paypal/checkout-server-sdk'
import { Redis } from 'ioredis'
import { prisma } from '../prisma'
import { LoggerService } from '../logger'
import { QueueService } from '../queue'
import { SecurityService } from '../security'
import { NotificationService } from '../notifications'

const logger = new LoggerService()
const queue = new QueueService()
const security = new SecurityService()
const notifications = new NotificationService()
const redis = new Redis(process.env.REDIS_URL!)

// Payment Provider Setup
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16'
})

const paypal = new PayPal.core.PayPalHttpClient(
  new PayPal.core.SandboxEnvironment(
    process.env.PAYPAL_CLIENT_ID!,
    process.env.PAYPAL_SECRET!
  )
)

export class PaymentService {
  async createPayment(data: {
    amount: number
    currency: string
    method: 'stripe' | 'paypal'
    customerId: string
    metadata?: any
  }) {
    try {
      // Transaktion starten
      const payment = await prisma.payment.create({
        data: {
          amount: data.amount,
          currency: data.currency,
          method: data.method,
          status: 'PENDING',
          customerId: data.customerId,
          metadata: data.metadata
        }
      })

      // Payment Intent erstellen
      let paymentIntent

      if (data.method === 'stripe') {
        paymentIntent = await this.createStripePayment(
          payment.id,
          data
        )
      } else {
        paymentIntent = await this.createPayPalPayment(
          payment.id,
          data
        )
      }

      // Payment aktualisieren
      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          providerPaymentId: paymentIntent.id,
          clientSecret: paymentIntent.client_secret
        }
      })

      // Fraud Detection
      await this.runFraudChecks(payment)

      return {
        paymentId: payment.id,
        clientSecret: paymentIntent.client_secret
      }
    } catch (error) {
      logger.log('error', 'Payment creation failed', { error })
      throw error
    }
  }

  async handleWebhook(
    provider: 'stripe' | 'paypal',
    event: any
  ) {
    try {
      // Webhook Signatur verifizieren
      await this.verifyWebhookSignature(provider, event)

      const paymentId = this.extractPaymentId(provider, event)
      const status = this.mapPaymentStatus(provider, event)

      // Payment Status aktualisieren
      await prisma.payment.update({
        where: { id: paymentId },
        data: { status }
      })

      // Post-Payment Aktionen
      if (status === 'COMPLETED') {
        await this.handleSuccessfulPayment(paymentId)
      } else if (status === 'FAILED') {
        await this.handleFailedPayment(paymentId)
      }

      // Benachrichtigungen senden
      await this.sendNotifications(paymentId, status)

      // Analytics aktualisieren
      await this.updateAnalytics(paymentId, status)
    } catch (error) {
      logger.log('error', 'Webhook handling failed', { error })
      throw error
    }
  }

  async refund(
    paymentId: string,
    amount?: number,
    reason?: string
  ) {
    try {
      const payment = await prisma.payment.findUnique({
        where: { id: paymentId }
      })

      if (!payment) {
        throw new Error('Payment nicht gefunden')
      }

      let refund

      if (payment.method === 'stripe') {
        refund = await this.refundStripePayment(
          payment,
          amount,
          reason
        )
      } else {
        refund = await this.refundPayPalPayment(
          payment,
          amount,
          reason
        )
      }

      // Refund in DB speichern
      await prisma.refund.create({
        data: {
          paymentId,
          amount: amount || payment.amount,
          reason,
          status: 'COMPLETED',
          providerRefundId: refund.id
        }
      })

      // Benachrichtigungen senden
      await notifications.send({
        type: 'REFUND_COMPLETED',
        userId: payment.customerId,
        data: {
          paymentId,
          amount: amount || payment.amount,
          currency: payment.currency
        }
      })

      return refund
    } catch (error) {
      logger.log('error', 'Refund failed', { error })
      throw error
    }
  }

  private async createStripePayment(
    paymentId: string,
    data: any
  ) {
    return stripe.paymentIntents.create({
      amount: data.amount,
      currency: data.currency,
      customer: data.customerId,
      metadata: {
        paymentId,
        ...data.metadata
      }
    })
  }

  private async createPayPalPayment(
    paymentId: string,
    data: any
  ) {
    const request = new PayPal.orders.OrdersCreateRequest()
    request.prefer('return=representation')
    request.requestBody({
      intent: 'CAPTURE',
      purchase_units: [{
        amount: {
          currency_code: data.currency,
          value: (data.amount / 100).toString()
        },
        custom_id: paymentId
      }]
    })

    const response = await paypal.execute(request)
    return {
      id: response.result.id,
      client_secret: response.result.id
    }
  }

  private async runFraudChecks(payment: any) {
    // Implementiere Fraud Detection
  }

  private async verifyWebhookSignature(
    provider: string,
    event: any
  ) {
    if (provider === 'stripe') {
      const signature = event.headers['stripe-signature']
      return stripe.webhooks.constructEvent(
        event.body,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET!
      )
    }
    // PayPal Signatur-Verifizierung
    return true
  }

  private extractPaymentId(provider: string, event: any): string {
    if (provider === 'stripe') {
      return event.data.object.metadata.paymentId
    }
    // PayPal Payment ID Extraktion
    return event.resource.custom_id
  }

  private mapPaymentStatus(
    provider: string,
    event: any
  ): string {
    // Status-Mapping implementieren
    return 'COMPLETED'
  }

  private async handleSuccessfulPayment(paymentId: string) {
    // Erfolgreiche Zahlung verarbeiten
  }

  private async handleFailedPayment(paymentId: string) {
    // Fehlgeschlagene Zahlung verarbeiten
  }

  private async sendNotifications(
    paymentId: string,
    status: string
  ) {
    // Benachrichtigungen senden
  }

  private async updateAnalytics(
    paymentId: string,
    status: string
  ) {
    // Analytics aktualisieren
  }
} 