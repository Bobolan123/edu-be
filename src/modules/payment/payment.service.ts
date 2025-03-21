import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Payment,
  PaymentMethod,
  PaymentStatus,
} from '../../entities/payment.entity';
import { VNPayService } from './services/vnpay.service';
import { PaypalService } from './services/paypal.service';
import { StripeService } from './services/stripe.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { PageMetaDto, PageOptionsDto } from 'src/common/dtos';

@Injectable()
export class PaymentService {
  constructor(
    @InjectRepository(Payment)
    private paymentRepository: Repository<Payment>,
    private vnpayService: VNPayService,
    private paypalService: PaypalService,
    private stripeService: StripeService,
  ) {}

  async createPayment(
    createPaymentDto: CreatePaymentDto,
    userId: string,
  ): Promise<Payment & { paymentUrl: string }> {
    const payment = await this.paymentRepository.save(
      this.paymentRepository.create({
        amount: createPaymentDto.amount,
        paymentMethod: createPaymentDto.paymentMethod,
        status: PaymentStatus.PENDING,
        userId,
        courseId: createPaymentDto.courseId,
      }),
    );

    let paymentUrl: string;
    switch (createPaymentDto.paymentMethod) {
      case PaymentMethod.VNPAY:
        paymentUrl = await this.vnpayService.createPaymentUrl(
          payment.id,
          payment.amount,
        );
        break;
      case PaymentMethod.PAYPAL:
        paymentUrl = await this.paypalService.createPaymentUrl(
          payment.id,
          payment.amount,
        );
        break;
      case PaymentMethod.CREDIT_CARD:
        paymentUrl = await this.stripeService.createPaymentUrl(
          payment.id,
          payment.amount,
        );
        break;
      default:
        throw new BadRequestException('Invalid payment method');
    }

    return { ...payment, paymentUrl };
  }

  async handlePaymentCallback(
    paymentMethod: PaymentMethod,
    params: any,
  ): Promise<Payment> {
    let payment: Payment;
    let isValid = false;
    let transactionId: string;
    let status = PaymentStatus.FAILED;

    switch (paymentMethod) {
      case PaymentMethod.VNPAY:
        isValid = await this.vnpayService.verifyReturnUrl(params);
        if (isValid) {
          payment = await this.findOne(params.vnp_TxnRef);
          transactionId = params.vnp_TransactionNo;
          status = PaymentStatus.COMPLETED;
        }
        break;

      case PaymentMethod.PAYPAL:
        isValid = await this.paypalService.verifyPayment(params);
        if (isValid) {
          payment = await this.findOne(params.orderId);
          transactionId = params.token;
          status = PaymentStatus.COMPLETED;
        }
        break;

      case PaymentMethod.CREDIT_CARD:
        isValid = await this.stripeService.verifyPayment(params);
        if (isValid) {
          payment = await this.findOne(params.metadata.orderId);
          transactionId = params.id;
          status = PaymentStatus.COMPLETED;
        }
        break;

      default:
        throw new BadRequestException('Invalid payment method');
    }

    if (!isValid) {
      throw new BadRequestException('Invalid payment signature');
    }

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    payment.status = status;
    payment.transactionId = transactionId;
    payment.paymentGatewayResponse = JSON.stringify(params);

    return this.paymentRepository.save(payment);
  }

  async findAll(
    pageOptionsDto: PageOptionsDto,
  ): Promise<{ items: Payment[]; meta: PageMetaDto }> {
    const queryBuilder = this.paymentRepository
      .createQueryBuilder('payment')
      .leftJoinAndSelect('payment.user', 'user')
      .leftJoinAndSelect('payment.course', 'course');

    queryBuilder
      .orderBy('payment.createdAt', pageOptionsDto.order)
      .skip(pageOptionsDto.skip)
      .take(pageOptionsDto.take);

    if (pageOptionsDto.search) {
      queryBuilder.andWhere('payment.id = :search', {
        search: pageOptionsDto.search,
      });
    }

    const [items, itemCount] = await queryBuilder.getManyAndCount();

    const meta = new PageMetaDto({
      itemCount,
      pageOptionsDto,
    });

    return { items, meta };
  }

  async findByUser(
    userId: string,
    pageOptionsDto: PageOptionsDto,
  ): Promise<{ items: Payment[]; meta: PageMetaDto }> {
    const queryBuilder = this.paymentRepository
      .createQueryBuilder('payment')
      .leftJoinAndSelect('payment.user', 'user')
      .leftJoinAndSelect('payment.course', 'course')
      .where('payment.userId = :userId', { userId });

    queryBuilder
      .orderBy('payment.createdAt', pageOptionsDto.order)
      .skip(pageOptionsDto.skip)
      .take(pageOptionsDto.take);

    if (pageOptionsDto.search) {
      queryBuilder.andWhere('payment.id = :search', {
        search: pageOptionsDto.search,
      });
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
