import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Order } from '../../entities/order.entity';
import { OrderCourse } from '../../entities/order-course.entity';
import { VNPayService } from './services/vnpay.service';
import { PaypalService } from './services/paypal.service';
import { StripeService } from './services/stripe.service';
import { ConfigService } from '@nestjs/config';
import { OrderService } from './order.service';
import { OrderController } from './order.controller';
import { OrderRecoveryService } from './order-recovery.service';
import { Cart } from 'src/entities/cart.entity';
import { Enrollment } from 'src/entities/enrollment.entity';
import { EnrollmentService } from '../enrollment/enrollment.service';
import { EnrollmentModule } from '../enrollment/enrollment.module';

@Module({
  imports: [TypeOrmModule.forFeature([Order, OrderCourse, Cart, Enrollment]), EnrollmentModule],
  controllers: [OrderController],
  providers: [
    OrderService,
    OrderRecoveryService,
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
  exports: [OrderService, VNPayService, PaypalService, StripeService],
})
export class PaymentModule {}
