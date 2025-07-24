import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';

@Injectable()
export class StripeService {
  private stripe: Stripe;

  constructor(private configService: ConfigService) {
    this.stripe = new Stripe(this.configService.get('STRIPE_SECRET_KEY'), {
      apiVersion: '2025-02-24.acacia',
    });
  }

  async createPaymentIntent(
    amount: number,
    currency: string = 'USD',
  ): Promise<string> {
    const paymentIntent = await this.stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency,
    });

    return paymentIntent.client_secret;
  }

  async confirmPayment(paymentIntentId: string): Promise<any> {
    const paymentIntent =
      await this.stripe.paymentIntents.retrieve(paymentIntentId);

    return {
      transactionId: paymentIntent.id,
      status: paymentIntent.status,
      paymentGatewayResponse: JSON.stringify(paymentIntent),
    };
  }
}
