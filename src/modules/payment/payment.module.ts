import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Payment } from '../../entities/payment.entity';
import { PaymentService } from './payment.service';
import { PaymentController } from './payment.controller';
import { VNPayService } from '../../services/payment-gateway/vnpay.service';
import { PayPalService } from '../../services/payment-gateway/paypal.service';
import { StripeService } from '../../services/payment-gateway/stripe.service';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    TypeOrmModule.forFeature([Payment]),
    ConfigModule,
  ],
  providers: [
    PaymentService,
    VNPayService,
    PayPalService,
    StripeService,
  ],
  controllers: [PaymentController],
  exports: [PaymentService],
})
export class PaymentModule {} 