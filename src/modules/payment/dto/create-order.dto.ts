import { IsNotEmpty, IsNumber, IsEnum, Min, IsOptional, IsString } from 'class-validator';
import { PaymentMethod } from '../../../entities/order.entity';

export class CreateOrderDto {
  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  totalPrice: number;

  @IsNotEmpty()
  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;

  @IsOptional()
  @IsString()
  transactionId?: string;

  @IsOptional()
  @IsString()
  paymentGatewayResponse?: string;

  @IsNotEmpty()
  @IsString()
  userId: string;
}
