// order.service.ts
import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order, OrderStatus, PaymentMethod } from '../../entities/order.entity';
import { VNPayService } from './services/vnpay.service';
import { PaypalService } from './services/paypal.service';
import { StripeService } from './services/stripe.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { PageMetaDto, PageOptionsDto } from 'src/common/dtos';
import { Cart } from 'src/entities/cart.entity';
import { EnrollmentService } from '../enrollment/enrollment.service';

@Injectable()
export class OrderService {
  constructor(
    @InjectRepository(Order)
    private orderRepository: Repository<Order>,
    private vnpayService: VNPayService,
    private paypalService: PaypalService,
    private stripeService: StripeService,
    @InjectRepository(Cart)
    private cartRepository: Repository<Cart>,
    private enrollmentService: EnrollmentService,
  ) {}

  async createOrder(
    createOrderDto: CreateOrderDto,
    userId: number,
  ): Promise<Order & { paymentUrl: string }> {
    const { cartId, paymentMethod } = createOrderDto;

    const cart = await this.cartRepository.findOne({
      where: { id: cartId, user: { id: userId }, isCheckedOut: false },
      relations: ['cartItems'],
    });

    if (!cart || cart.cartItems.length === 0) {
      throw new NotFoundException('Cart not found or is empty.');
    }

    const totalPrice = cart.cartItems.reduce((sum, item) => sum + item.price, 0);

    const order = await this.orderRepository.save(
      this.orderRepository.create({
        totalPrice,
        paymentMethod,
        status: OrderStatus.PENDING,
        user: { id: userId },
      }),
    );

    let paymentUrl: string;
    switch (paymentMethod) {
      case PaymentMethod.VNPAY:
        paymentUrl = await this.vnpayService.createPaymentUrl(order.id, totalPrice);
        break;
      case PaymentMethod.PAYPAL:
        paymentUrl = await this.paypalService.createPaymentUrl(order.id, totalPrice);
        break;
      default:
        throw new BadRequestException('Unsupported payment method');
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

    if (status === OrderStatus.COMPLETED) {
      const cart = await this.cartRepository.findOne({
        where: { user: { id: order.user.id }, isCheckedOut: false },
        relations: ['cartItems', 'cartItems.course'],
      });

      if (cart) {
        cart.isCheckedOut = true;
        await this.cartRepository.save(cart);

        if (cart.cartItems?.length) {
          await Promise.all(
            cart.cartItems.map((item) =>
              this.enrollmentService.createFromEntities(order.user, item.course),
            ),
          );
        }
      }
    }

    order.status = status;
    order.transactionId = transactionId;
    order.paymentGatewayResponse = JSON.stringify(params);
    return this.orderRepository.save(order);
  }

  async findAll(pageOptionsDto: PageOptionsDto): Promise<{ items: Order[]; meta: PageMetaDto }> {
    const queryBuilder = this.orderRepository
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.user', 'user')
      .orderBy('order.createdAt', pageOptionsDto.order)
      .skip(pageOptionsDto.skip)
      .take(pageOptionsDto.take);

    if (pageOptionsDto.search) {
      queryBuilder.andWhere('order.id = :search', { search: pageOptionsDto.search });
    }

    const [items, itemCount] = await queryBuilder.getManyAndCount();
    const meta = new PageMetaDto({ itemCount, pageOptionsDto });
    return { items, meta };
  }

  async findByUser(userId: string, pageOptionsDto: PageOptionsDto): Promise<{ items: Order[]; meta: PageMetaDto }> {
    const queryBuilder = this.orderRepository
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.user', 'user')
      .where('order.userId = :userId', { userId })
      .orderBy('order.createdAt', pageOptionsDto.order)
      .skip(pageOptionsDto.skip)
      .take(pageOptionsDto.take);

    if (pageOptionsDto.search) {
      queryBuilder.andWhere('order.id = :search', { search: pageOptionsDto.search });
    }

    const [items, itemCount] = await queryBuilder.getManyAndCount();
    const meta = new PageMetaDto({ itemCount, pageOptionsDto });
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
