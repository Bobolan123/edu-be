import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Order,
  OrderStatus,
  PaymentMethod,
} from '../../entities/order.entity';
import { VNPayService } from './services/vnpay.service';
import { PaypalService } from './services/paypal.service';
import { StripeService } from './services/stripe.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { PageMetaDto, PageOptionsDto } from 'src/common/dtos';

@Injectable()
export class OrderService {
  constructor(
    @InjectRepository(Order)
    private orderRepository: Repository<Order>,
    private vnpayService: VNPayService,
    private paypalService: PaypalService,
    private stripeService: StripeService,
  ) {}

  async createOrder(
    createOrderDto: CreateOrderDto,
    userId: number,
  ): Promise<Order & { paymentUrl: string }> {
    const order = await this.orderRepository.save(
      this.orderRepository.create({
        totalPrice: createOrderDto.totalPrice,
        paymentMethod: createOrderDto.paymentMethod,
        status: OrderStatus.PENDING,
        user: { id: +userId },
      }),
    );

    let paymentUrl: string;
    switch (createOrderDto.paymentMethod) {
      case PaymentMethod.VNPAY:
        paymentUrl = await this.vnpayService.createPaymentUrl(
          order.id,
          order.totalPrice,
        );
        break;
      case PaymentMethod.PAYPAL:
        paymentUrl = await this.paypalService.createPaymentUrl(
          order.id,
          order.totalPrice,
        );
        break;
      case PaymentMethod.CREDIT_CARD:
        paymentUrl = await this.stripeService.createPaymentUrl(
          order.id,
          order.totalPrice,
        );
        break;
      default:
        throw new BadRequestException('Invalid payment method');
    }

    return { ...order, paymentUrl };
  }

  async handlePaymentCallback(
    paymentMethod: PaymentMethod,
    params: any,
  ): Promise<Order> {
    let order: Order;
    let isValid = false;
    let transactionId: string;
    let status = OrderStatus.FAILED;

    switch (paymentMethod) {
      case PaymentMethod.VNPAY:
        isValid = await this.vnpayService.verifyReturnUrl(params);
        if (isValid) {
          order = await this.findOne(params.vnp_TxnRef);
          transactionId = params.vnp_TransactionNo;
          status = OrderStatus.COMPLETED;
        }
        break;

      case PaymentMethod.PAYPAL:
        isValid = await this.paypalService.verifyPayment(params);
        if (isValid) {
          order = await this.findOne(params.orderId);
          transactionId = params.token;
          status = OrderStatus.COMPLETED;
        }
        break;

      case PaymentMethod.CREDIT_CARD:
        isValid = await this.stripeService.verifyPayment(params);
        if (isValid) {
          order = await this.findOne(params.metadata.orderId);
          transactionId = params.id;
          status = OrderStatus.COMPLETED;
        }
        break;

      default:
        throw new BadRequestException('Invalid payment method');
    }

    if (!isValid) {
      throw new BadRequestException('Invalid payment signature');
    }

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    order.status = status;
    order.transactionId = transactionId;
    order.paymentGatewayResponse = JSON.stringify(params);

    return this.orderRepository.save(order);
  }

  async findAll(
    pageOptionsDto: PageOptionsDto,
  ): Promise<{ items: Order[]; meta: PageMetaDto }> {
    const queryBuilder = this.orderRepository
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.user', 'user');

    queryBuilder
      .orderBy('order.createdAt', pageOptionsDto.order)
      .skip(pageOptionsDto.skip)
      .take(pageOptionsDto.take);

    if (pageOptionsDto.search) {
      queryBuilder.andWhere('order.id = :search', {
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
  ): Promise<{ items: Order[]; meta: PageMetaDto }> {
    const queryBuilder = this.orderRepository
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.user', 'user')
      .where('order.userId = :userId', { userId });

    queryBuilder
      .orderBy('order.createdAt', pageOptionsDto.order)
      .skip(pageOptionsDto.skip)
      .take(pageOptionsDto.take);

    if (pageOptionsDto.search) {
      queryBuilder.andWhere('order.id = :search', {
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

  async findOne(id: string): Promise<Order> {
    const order = await this.orderRepository.findOne({
      where: { id },
      relations: ['user'],
    });
    if (!order) {
      throw new NotFoundException('Order not found');
    }
    return order;
  }
}
