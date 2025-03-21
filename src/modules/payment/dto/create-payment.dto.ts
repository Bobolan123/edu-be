import { IsNotEmpty, IsNumber, IsEnum, Min } from 'class-validator';
import { PaymentMethod } from '../../../entities/payment.entity';

export class CreatePaymentDto {
  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  amount: number;

  @IsNotEmpty()
  courseId: string;

  @IsNotEmpty()
  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;
} 