import { Injectable, Inject } from '@nestjs/common';
import * as paypal from '@paypal/checkout-server-sdk';

interface PayPalConfig {
  paypal: {
    clientId: string;
    clientSecret: string;
    mode: string;
  };
}

@Injectable()
export class PaypalService {
  private client: paypal.core.PayPalHttpClient;

  constructor(
    @Inject('PAYMENT_CONFIG') private readonly config: PayPalConfig
  ) {
    let environment;
    if (this.config.paypal.mode === 'live') {
      environment = new paypal.core.LiveEnvironment(
        this.config.paypal.clientId,
        this.config.paypal.clientSecret
      );
    } else {
      environment = new paypal.core.SandboxEnvironment(
        this.config.paypal.clientId,
        this.config.paypal.clientSecret
      );
    }
    this.client = new paypal.core.PayPalHttpClient(environment);
  }

  async createPaymentUrl(orderId: string, amount: number): Promise<string> {
    const request = new paypal.orders.OrdersCreateRequest();
    request.prefer("return=representation");
    request.requestBody({
      intent: 'CAPTURE',
      purchase_units: [{
        reference_id: orderId,
        amount: {
          currency_code: 'USD',
          value: amount.toString()
        }
      }]
    });

    try {
      const order = await this.client.execute(request);
      const links = order.result.links;
      const approvalLink = links.find(link => link.rel === 'approve');
      return approvalLink.href;
    } catch (err) {
      throw new Error('Failed to create PayPal payment: ' + err.message);
    }
  }

  async verifyPayment(params: any): Promise<boolean> {
    const request = new paypal.orders.OrdersCaptureRequest(params.token);
    request.requestBody({});

    try {
      const capture = await this.client.execute(request);
      return capture.result.status === 'COMPLETED';
    } catch (err) {
      throw new Error('Failed to verify PayPal payment: ' + err.message);
    }
  }
} 