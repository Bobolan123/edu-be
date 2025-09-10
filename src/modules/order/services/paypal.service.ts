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

  constructor(@Inject('PAYMENT_CONFIG') private readonly config: PayPalConfig) {
    let environment;
    if (this.config.paypal.mode === 'live') {
      environment = new paypal.core.LiveEnvironment(
        this.config.paypal.clientId,
        this.config.paypal.clientSecret,
      );
    } else {
      environment = new paypal.core.SandboxEnvironment(
        this.config.paypal.clientId,
        this.config.paypal.clientSecret,
      );
    }
    this.client = new paypal.core.PayPalHttpClient(environment);
  }

  async createPaymentUrl(orderId: string, amount: number): Promise<string> {
    const request = new paypal.orders.OrdersCreateRequest();
    request.prefer('return=representation');
    request.requestBody({
      intent: 'CAPTURE',
      application_context: {
        brand_name: 'Mindful Maze',
        landing_page: 'LOGIN',
        user_action: 'PAY_NOW',
        return_url: `${process.env.BACKEND_URL}/payments/paypal-return`,
        cancel_url: `${process.env.BACKEND_URL}/payments/paypal-cancel`,
      },
      purchase_units: [
        {
          reference_id: orderId,
          amount: {
            currency_code: 'USD',
            value: amount.toString(),
          },
        },
      ],
    });

    try {
      const order = await this.client.execute(request);
      const links = order.result.links;
      const approvalLink = links.find((link) => link.rel === 'approve');
      return approvalLink.href;
    } catch (err) {
      throw new Error('Failed to create PayPal payment: ' + err.message);
    }
  }

  async verifyPayment(params: any): Promise<boolean> {
    if (!params || !params.token) {
      throw new Error('Missing PayPal token parameter');
    }

    try {
      // First get the order to verify it exists and is valid
      const getRequest = new paypal.orders.OrdersGetRequest(params.token);
      const orderResponse = await this.client.execute(getRequest);
      
      if (orderResponse.result.status !== 'APPROVED') {
        return false;
      }

      // Then capture the payment
      const captureRequest = new paypal.orders.OrdersCaptureRequest(params.token);
      captureRequest.requestBody({});

      const capture = await this.client.execute(captureRequest);
      
      // Verify capture was successful
      return (
        capture.result.status === 'COMPLETED' &&
        capture.result.purchase_units &&
        capture.result.purchase_units.length > 0 &&
        capture.result.purchase_units[0].payments &&
        capture.result.purchase_units[0].payments.captures &&
        capture.result.purchase_units[0].payments.captures[0].status === 'COMPLETED'
      );
    } catch (err) {
      // Check if it's already captured
      if (err.message && err.message.includes('ORDER_ALREADY_CAPTURED')) {
        try {
          const getRequest = new paypal.orders.OrdersGetRequest(params.token);
          const orderResponse = await this.client.execute(getRequest);
          return orderResponse.result.status === 'COMPLETED';
        } catch (getErr) {
          throw new Error('Failed to verify PayPal payment: ' + getErr.message);
        }
      }
      throw new Error('Failed to verify PayPal payment: ' + err.message);
    }
  }
}
