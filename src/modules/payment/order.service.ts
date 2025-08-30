// order.service.ts
import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Order, OrderStatus, PaymentMethod } from '../../entities/order.entity';
import { VNPayService } from './services/vnpay.service';
import { PaypalService } from './services/paypal.service';
import { StripeService } from './services/stripe.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { PageMetaDto, PageOptionsDto, ResponsePaginate } from 'src/common/dtos';
import { OrderSearchFilterDto } from './dto/order-search-filter.dto';
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
    private dataSource: DataSource,
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

    const totalPrice = cart.cartItems.reduce(
      (sum, item) => sum + item.price,
      0,
    );

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
        paymentUrl = await this.vnpayService.createPaymentUrl(
          order.id,
          totalPrice,
        );
        break;
      case PaymentMethod.PAYPAL:
        paymentUrl = await this.paypalService.createPaymentUrl(
          order.id,
          totalPrice,
        );
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
    let isSuccess = false;
    let transactionId: string;
    let status = OrderStatus.FAILED;

    switch (paymentMethod) {
      case PaymentMethod.VNPAY:
        const vnpayResult = this.vnpayService.verifyReturnUrl(params);
        isValid = vnpayResult.isValid;
        isSuccess = vnpayResult.isSuccess;
        if (isValid) {
          order = await this.findOne(params.vnp_TxnRef);
          transactionId = params.vnp_TransactionNo;
          status = isSuccess ? OrderStatus.COMPLETED : OrderStatus.FAILED;
        }
        break;
      case PaymentMethod.PAYPAL:
        isValid = await this.paypalService.verifyPayment(params);
        if (isValid) {
          order = await this.findOne(params.orderId);
          transactionId = params.token;
          status = OrderStatus.COMPLETED;
          isSuccess = true;
        }
        break;
      case PaymentMethod.CREDIT_CARD:
        isValid = await this.stripeService.verifyPayment(params);
        if (isValid) {
          order = await this.findOne(params.metadata.orderId);
          transactionId = params.id;
          status = OrderStatus.COMPLETED;
          isSuccess = true;
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

    return this.dataSource.transaction(async (manager) => {
      try {
        if (status === OrderStatus.COMPLETED) {
          const cart = await manager.findOne(Cart, {
            where: { user: { id: order.user.id }, isCheckedOut: false },
            relations: ['cartItems', 'cartItems.course', 'user'],
          });

          if (cart && cart.cartItems?.length) {
            const enrollmentPromises = cart.cartItems.map((item) =>
              this.enrollmentService.createFromEntities(
                order.user,
                item.course,
              ),
            );

            await Promise.all(enrollmentPromises);

            cart.isCheckedOut = true;
            await manager.save(Cart, cart);
          }
        }

        order.status = status;
        order.transactionId = transactionId;
        order.paymentGatewayResponse = JSON.stringify(params);

        return await manager.save(Order, order);
      } catch (error) {
        throw new BadRequestException(
          `Failed to process payment callback: ${error.message}`,
        );
      }
    });
  }

  async findAll(
    filterDto: OrderSearchFilterDto,
  ): Promise<ResponsePaginate<Order>> {
    const {
      search,
      transactionId,
      status,
      paymentMethod,
      minPrice,
      maxPrice,
      startDate,
      endDate,
      userId,
      userName,
      userEmail,
      order,
      orderBy,
    } = filterDto;

    const queryBuilder = this.orderRepository
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.user', 'user');

    // General search across order ID, transaction ID, and user details
    if (search) {
      queryBuilder.andWhere(
        '(CAST(order.id AS TEXT) ILIKE :search OR order.transactionId ILIKE :search OR user.name ILIKE :search OR user.email ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    // Specific transaction ID search
    if (transactionId) {
      queryBuilder.andWhere('order.transactionId ILIKE :transactionId', {
        transactionId: `%${transactionId}%`,
      });
    }

    // Status filter
    if (status) {
      queryBuilder.andWhere('order.status = :status', { status });
    }

    // Payment method filter
    if (paymentMethod) {
      queryBuilder.andWhere('order.paymentMethod = :paymentMethod', {
        paymentMethod,
      });
    }

    // Price range filters
    if (minPrice !== undefined) {
      queryBuilder.andWhere('order.totalPrice >= :minPrice', { minPrice });
    }

    if (maxPrice !== undefined) {
      queryBuilder.andWhere('order.totalPrice <= :maxPrice', { maxPrice });
    }

    // Date range filters
    if (startDate) {
      queryBuilder.andWhere('order.createdAt >= :startDate', {
        startDate: new Date(startDate),
      });
    }

    if (endDate) {
      queryBuilder.andWhere('order.createdAt <= :endDate', {
        endDate: new Date(endDate + 'T23:59:59.999Z'),
      });
    }

    // User ID filter
    if (userId) {
      queryBuilder.andWhere('user.id = :userId', { userId });
    }

    // User name filter
    if (userName) {
      queryBuilder.andWhere('user.name ILIKE :userName', {
        userName: `%${userName}%`,
      });
    }

    // User email filter
    if (userEmail) {
      queryBuilder.andWhere('user.email ILIKE :userEmail', {
        userEmail: `%${userEmail}%`,
      });
    }

    // Sorting
    const validOrderByFields = [
      'id',
      'totalPrice',
      'status',
      'paymentMethod',
      'createdAt',
      'updatedAt',
      'transactionId',
    ];
    const sortField = validOrderByFields.includes(orderBy) ? orderBy : 'createdAt';


    queryBuilder
      .orderBy(`order.${sortField}`, order || 'DESC')
      .skip(filterDto.skip)
      .take(filterDto.take);

    const [items, itemCount] = await queryBuilder.getManyAndCount();

    const pageMetaDto = new PageMetaDto({
      itemCount,
      pageOptionsDto: filterDto,
    });

    return { result: items, meta: pageMetaDto };
  }

  async findByUser(
    userId: string,
    pageOptionsDto: PageOptionsDto,
  ): Promise<{ items: Order[]; meta: PageMetaDto }> {
    const queryBuilder = this.orderRepository
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.user', 'user')
      .where('order.userId = :userId', { userId })
      .orderBy('order.createdAt', pageOptionsDto.order)
      .skip(pageOptionsDto.skip)
      .take(pageOptionsDto.take);

    if (pageOptionsDto.search) {
      queryBuilder.andWhere('CAST(order.id AS TEXT) ILIKE :search', {
        search: `%${pageOptionsDto.search}%`,
      });
    }

    const [items, itemCount] = await queryBuilder.getManyAndCount();
    const meta = new PageMetaDto({ itemCount, pageOptionsDto });
    return { items, meta };
  }

  async findOne(id: string): Promise<Order> {
    const order = await this.orderRepository.findOne({
      where: { id },
      relations: ['user', 'courses'],
    });
    if (!order) {
      throw new NotFoundException('Order not found');
    }
    return order;
  }

  async updateOrderStatus(
    id: string,
    status: OrderStatus,
    gatewayResponse?: any,
  ): Promise<Order> {
    const order = await this.findOne(id);
    order.status = status;
    if (gatewayResponse) {
      order.paymentGatewayResponse = JSON.stringify(gatewayResponse);
    }
    return this.orderRepository.save(order);
  }

  async deleteOrder(id: string): Promise<void> {
    await this.orderRepository.delete(id);
  }
}
