import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import Stripe from 'stripe';
import { Order } from '../orders/schemas/order.schema';
import { CartService } from '../cart/cart.service';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

@Injectable()
export class CheckoutService {
  constructor(
    @InjectModel(Order.name) private orderModel: Model<Order>,
    private cartService: CartService,
  ) {}

  async createCheckoutSession(userId: string, shippingAddress: any) {
    const cart = await this.cartService.getCart(userId);
    if (!cart || cart.items.length === 0) {
      throw new Error('Warenkorb ist leer');
    }

    // Erstelle Order
    const order = await this.orderModel.create({
      userId,
      items: cart.items,
      shippingAddress,
      total: cart.total,
    });

    // Erstelle Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: cart.items.map(item => ({
        price_data: {
          currency: 'eur',
          product_data: {
            name: item.productId.name,
            images: item.productId.images,
          },
          unit_amount: Math.round((item.discountPrice || item.price) * 100),
        },
        quantity: item.quantity,
      })),
      mode: 'payment',
      success_url: `${process.env.FRONTEND_URL}/checkout/success?orderId=${order._id}`,
      cancel_url: `${process.env.FRONTEND_URL}/checkout/cancel`,
      customer_email: order.userId.email,
      metadata: {
        orderId: order._id.toString(),
      },
    });

    return { sessionId: session.id, orderId: order._id };
  }

  async handleWebhook(signature: string, payload: Buffer) {
    const event = stripe.webhooks.constructEvent(
      payload,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      const orderId = session.metadata?.orderId;

      if (orderId) {
        await this.orderModel.findByIdAndUpdate(orderId, {
          status: 'paid',
          paymentIntentId: session.payment_intent,
        });
      }
    }
  }
} 