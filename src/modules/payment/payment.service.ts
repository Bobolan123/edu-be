import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Payment, PaymentMethod, PaymentStatus } from '../../entities/payment.entity';
import { VNPayService } from '../../services/payment-gateway/vnpay.service';
import { PayPalService } from '../../services/payment-gateway/paypal.service';
import { StripeService } from '../../services/payment-gateway/stripe.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { PageOptionsDto, Order } from '../../common/dto/page-options.dto';
import { PageMetaDto } from '../../common/dto/page-meta.dto';

@Injectable()
export class PaymentService {
  constructor(
    @InjectRepository(Payment)
    private paymentRepository: Repository<Payment>,
    private vnpayService: VNPayService,
    private paypalService: PayPalService,
    private stripeService: StripeService,
  ) {}

  async createPayment(createPaymentDto: CreatePaymentDto, userId: string): Promise<Payment & { paymentUrl: string }> {
    const payment = await this.paymentRepository.save(
      this.paymentRepository.create({
        amount: createPaymentDto.amount,
        paymentMethod: createPaymentDto.paymentMethod,
        status: PaymentStatus.PENDING,
        userId,
        courseId: createPaymentDto.courseId,
      })
    );

    let paymentUrl: string;
    switch (createPaymentDto.paymentMethod) {
      case PaymentMethod.VNPAY:
        paymentUrl = await this.vnpayService.createPaymentUrl(
          payment.id,
          createPaymentDto.amount,
          '127.0.0.1', // TODO: Get actual IP address
        );
        break;
      case PaymentMethod.PAYPAL:
        const orderId = await this.paypalService.createOrder(createPaymentDto.amount);
        paymentUrl = `https://www.sandbox.paypal.com/checkoutnow?token=${orderId}`;
        await this.paymentRepository.update(payment.id, { transactionId: orderId });
        break;
      case PaymentMethod.CREDIT_CARD:
        const clientSecret = await this.stripeService.createPaymentIntent(createPaymentDto.amount);
        paymentUrl = clientSecret; // Frontend will handle this differently
        break;
      default:
        throw new BadRequestException('Invalid payment method');
    }

    return { ...payment, paymentUrl };
  }

  async handlePaymentCallback(paymentMethod: PaymentMethod, params: any): Promise<Payment> {
    let payment: Payment;
    let paymentResult: any;

    switch (paymentMethod) {
      case PaymentMethod.VNPAY:
        if (!this.vnpayService.verifyReturnUrl(params)) {
          throw new BadRequestException('Invalid payment signature');
        }
        payment = await this.paymentRepository.findOne({ where: { id: params.vnp_TxnRef } });
        paymentResult = {
          transactionId: params.vnp_TransactionNo,
          status: params.vnp_ResponseCode === '00' ? PaymentStatus.COMPLETED : PaymentStatus.FAILED,
          paymentGatewayResponse: JSON.stringify(params),
        };
        break;

      case PaymentMethod.PAYPAL:
        payment = await this.paymentRepository.findOne({ where: { transactionId: params.token } });
        paymentResult = await this.paypalService.capturePayment(params.token);
        break;

      case PaymentMethod.CREDIT_CARD:
        payment = await this.paymentRepository.findOne({ where: { transactionId: params.payment_intent } });
        paymentResult = await this.stripeService.confirmPayment(params.payment_intent);
        break;

      default:
        throw new BadRequestException('Invalid payment method');
    }

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    const updatedPayment = await this.paymentRepository.save({
      ...payment,
      ...paymentResult,
    });

    return updatedPayment;
  }

  async findAll(pageOptionsDto: PageOptionsDto): Promise<{ items: Payment[]; meta: PageMetaDto }> {
    const queryBuilder = this.paymentRepository.createQueryBuilder('payment')
      .leftJoinAndSelect('payment.user', 'user')
      .leftJoinAndSelect('payment.course', 'course');

    queryBuilder
      .orderBy('payment.createdAt', pageOptionsDto.order || Order.DESC)
      .skip(pageOptionsDto.skip)
      .take(pageOptionsDto.take);

    if (pageOptionsDto.search) {
      queryBuilder.andWhere('payment.id = :search', { search: pageOptionsDto.search });
    }

    const [items, itemCount] = await queryBuilder.getManyAndCount();

    const meta = new PageMetaDto({
      itemCount,
      pageOptionsDto,
    });

    return { items, meta };
  }

  async findByUser(userId: string, pageOptionsDto: PageOptionsDto): Promise<{ items: Payment[]; meta: PageMetaDto }> {
    const queryBuilder = this.paymentRepository.createQueryBuilder('payment')
      .leftJoinAndSelect('payment.user', 'user')
      .leftJoinAndSelect('payment.course', 'course')
      .where('payment.userId = :userId', { userId });

    queryBuilder
      .orderBy('payment.createdAt', pageOptionsDto.order || Order.DESC)
      .skip(pageOptionsDto.skip)
      .take(pageOptionsDto.take);

    if (pageOptionsDto.search) {
      queryBuilder.andWhere('payment.id = :search', { search: pageOptionsDto.search });
    }

    const [items, itemCount] = await queryBuilder.getManyAndCount();

    const meta = new PageMetaDto({
      itemCount,
      pageOptionsDto,
    });

    return { items, meta };
  }

  async findOne(id: string): Promise<Payment> {
    const payment = await this.paymentRepository.findOne({
      where: { id },
      relations: ['user', 'course'],
    });
    if (!payment) {
      throw new NotFoundException('Payment not found');
    }
    return payment;
  }
} 