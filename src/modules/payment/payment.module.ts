import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Payment } from '../../entities/payment.entity';
import { PaymentController } from './payment.controller';
import { PaymentService } from './payment.service';
import { VNPayService } from './services/vnpay.service';
import { PaypalService } from './services/paypal.service';
import { StripeService } from './services/stripe.service';
import { ConfigService } from '@nestjs/config';

@Module({
  imports: [TypeOrmModule.forFeature([Payment])],
  controllers: [PaymentController],
  providers: [
    PaymentService,
    VNPayService,
    PaypalService,
    StripeService,
    {
      provide: 'PAYMENT_CONFIG',
      useFactory: (configService: ConfigService) => ({
        vnpay: {
          tmnCode: configService.get('VNPAY_TMN_CODE'),
          hashSecret: configService.get('VNPAY_HASH_SECRET'),
          url:
            configService.get('VNPAY_URL') ||
            'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html',
          returnUrl:
            configService.get('VNPAY_RETURN_URL') ||
            'http://localhost:3000/payment/vnpay-return',
        },
        paypal: {
          clientId: configService.get('PAYPAL_CLIENT_ID'),
          clientSecret: configService.get('PAYPAL_CLIENT_SECRET'),
          mode: configService.get('PAYPAL_MODE') || 'sandbox',
        },
        stripe: {
          secretKey: configService.get('STRIPE_SECRET_KEY'),
          webhookSecret: configService.get('STRIPE_WEBHOOK_SECRET'),
        },
      }),
      inject: [ConfigService],
    },
  ],
  exports: [PaymentService, VNPayService, PaypalService, StripeService],
})
export class PaymentModule {}
