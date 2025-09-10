import { Injectable, Inject } from '@nestjs/common';
import Stripe from 'stripe';

interface StripeConfig {
  stripe: {
    secretKey: string;
    webhookSecret: string;
  };
}

@Injectable()
export class StripeService {
  private stripe: Stripe;

  constructor(@Inject('PAYMENT_CONFIG') private readonly config: StripeConfig) {
    this.stripe = new Stripe(this.config.stripe.secretKey, {
      apiVersion: '2025-02-24.acacia',
    });
  }

  async createPaymentUrl(orderId: string, amount: number): Promise<string> {
    try {
      const session = await this.stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: 'usd',
              product_data: {
                name: `Order ${orderId}`,
              },
              unit_amount: Math.round(amount * 100), // Convert to cents
            },
            quantity: 1,
          },
        ],
        mode: 'payment',
        success_url: `${process.env.FRONTEND_URL}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.FRONTEND_URL}/payment/cancel`,
        metadata: {
          orderId,
        },
      });

      return session.url;
    } catch (err) {
      throw new Error('Failed to create Stripe payment: ' + err.message);
    }
  }

  async verifyPayment(params: any): Promise<boolean> {
    try {
      // Verify webhook signature first
      const event = this.stripe.webhooks.constructEvent(
        params.body,
        params.signature,
        this.config.stripe.webhookSecret,
      );

      // Handle different event types
      switch (event.type) {
        case 'checkout.session.completed':
          const session = event.data.object as Stripe.Checkout.Session;
          // Double-check payment status
          const retrievedSession = await this.stripe.checkout.sessions.retrieve(
            session.id,
          );
          return (
            retrievedSession.payment_status === 'paid' &&
            retrievedSession.status === 'complete'
          );
        case 'payment_intent.succeeded':
          const paymentIntent = event.data.object as Stripe.PaymentIntent;
          return paymentIntent.status === 'succeeded';
        default:
          return false;
      }
    } catch (err) {
      throw new Error('Failed to verify Stripe payment: ' + err.message);
    }
  }

  async constructWebhookEvent(
    payload: string,
    signature: string,
  ): Promise<Stripe.Event> {
    return this.stripe.webhooks.constructEvent(
      payload,
      signature,
      this.config.stripe.webhookSecret,
    );
  }
}
