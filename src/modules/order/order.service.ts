// order.service.ts
import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Order, OrderStatus, PaymentMethod } from '../../entities/order.entity';
import { OrderCourse } from '../../entities/order-course.entity';
import { VNPayService } from './services/vnpay.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { PageMetaDto, PageOptionsDto, ResponsePaginate } from 'src/common/dtos';
import { OrderSearchFilterDto } from './dto/order-search-filter.dto';
import { Cart } from 'src/entities/cart.entity';
import { Enrollment } from 'src/entities/enrollment.entity';
import { EnrollmentService } from '../enrollment/enrollment.service';
import * as crypto from 'crypto';

@Injectable()
export class OrderService {
  constructor(
    @InjectRepository(Order)
    private orderRepository: Repository<Order>,
    @InjectRepository(OrderCourse)
    private orderCourseRepository: Repository<OrderCourse>,
    @InjectRepository(Enrollment)
    private enrollmentRepository: Repository<Enrollment>,
    private vnpayService: VNPayService,
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

    return this.dataSource.transaction(async (manager) => {
      // Lock and validate cart - first lock the cart, then load relations separately
      const cart = await manager.findOne(Cart, {
        where: { id: cartId, user: { id: userId }, isCheckedOut: false },
        lock: { mode: 'pessimistic_write' },
      });

      if (!cart) {
        throw new NotFoundException('Cart not found or is empty.');
      }

      // Load relations after locking
      const cartWithRelations = await manager.findOne(Cart, {
        where: { id: cartId },
        relations: ['cartItems', 'cartItems.course', 'user'],
      });

      if (!cartWithRelations || cartWithRelations.cartItems.length === 0) {
        throw new NotFoundException('Cart not found or is empty.');
      }

      // Will recalculate totalPrice after filtering enrolled courses
      let totalPrice = 0;

      // Filter out already enrolled courses
      const validCartItems = [];
      const alreadyEnrolledCourses = [];

      for (const item of cartWithRelations.cartItems) {
        const existingEnrollment = await manager.findOne(Enrollment, {
          where: { student: { id: userId }, course: { id: item.course.id } },
        });
        if (existingEnrollment) {
          alreadyEnrolledCourses.push(item.course.title);
        } else {
          validCartItems.push(item);
        }
      }

      if (validCartItems.length === 0) {
        if (alreadyEnrolledCourses.length > 0) {
          throw new BadRequestException(
            `You are already enrolled in all courses in your cart: ${alreadyEnrolledCourses.join(', ')}`,
          );
        }
        throw new BadRequestException('No valid courses found in cart');
      }

      // Calculate total price from valid items only
      totalPrice = validCartItems.reduce((sum, item) => sum + item.price, 0);

      // Validate total price for payment processing
      if (totalPrice <= 0) {
        throw new BadRequestException('Total price must be greater than zero');
      }


      // If some courses were already enrolled, we could optionally warn but continue
      if (alreadyEnrolledCourses.length > 0) {
        console.log(
          `Skipping already enrolled courses: ${alreadyEnrolledCourses.join(', ')}`,
        );
      }

      // Generate idempotency key
      const idempotencyKey = crypto
        .createHash('sha256')
        .update(`${userId}-${cartId}-${Date.now()}`)
        .digest('hex');

      // Create order with status history
      const order = manager.create(Order, {
        totalPrice,
        paymentMethod,
        status: OrderStatus.PENDING,
        user: { id: userId },
        idempotencyKey,
        paymentInitiatedAt: new Date(),
        statusHistory: [
          {
            status: OrderStatus.PENDING,
            timestamp: new Date(),
            reason: 'Order created',
          },
        ],
      });

      const savedOrder = await manager.save(Order, order);

      // Create order courses from valid items only
      const orderCourses = validCartItems.map((item) =>
        manager.create(OrderCourse, {
          order: savedOrder,
          course: item.course,
          price: item.price,
        }),
      );

      await manager.save(OrderCourse, orderCourses);

      // Generate payment URL
      let paymentUrl: string;
      try {
        switch (paymentMethod) {
          case PaymentMethod.VNPAY:
            paymentUrl = await this.vnpayService.createPaymentUrl(
              savedOrder.id,
              totalPrice,
            );
            break;
          default:
            throw new BadRequestException('Unsupported payment method');
        }
      } catch (error) {
        throw new BadRequestException(
          `Failed to create payment URL: ${error.message}`,
        );
      }

      return { ...savedOrder, paymentUrl };
    });
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
    let orderId: string;

    // Verify payment based on method
    switch (paymentMethod) {
      case PaymentMethod.VNPAY:
        const vnpayResult = this.vnpayService.verifyReturnUrl(params);
        isValid = vnpayResult.isValid;
        isSuccess = vnpayResult.isSuccess;
        orderId = params.vnp_TxnRef;
        transactionId = params.vnp_TransactionNo;
        status = isSuccess ? OrderStatus.COMPLETED : OrderStatus.FAILED;
        break;
      default:
        throw new BadRequestException('Invalid payment method');
    }

    if (!isValid) {
      throw new BadRequestException('Invalid payment signature');
    }

    return this.dataSource.transaction(async (manager) => {
      try {
        // Lock order to prevent concurrent processing - first lock, then load relations
        order = await manager.findOne(Order, {
          where: { id: orderId },
          lock: { mode: 'pessimistic_write' },
        });

        if (!order) {
          throw new NotFoundException('Order not found');
        }

        // Load relations after locking
        order = await manager.findOne(Order, {
          where: { id: orderId },
          relations: ['user', 'orderCourses', 'orderCourses.course'],
        });

        if (!order) {
          throw new NotFoundException('Order not found');
        }

        // Check for duplicate processing using idempotency
        if (order.status === OrderStatus.COMPLETED && order.transactionId) {
          return order; // Already processed
        }

        // Validate order state
        if (order.status !== OrderStatus.PENDING) {
          throw new BadRequestException(
            `Order cannot be processed. Current status: ${order.status}`,
          );
        }

        // Update order status and add to history
        const statusUpdate = {
          status,
          timestamp: new Date(),
          reason: isSuccess ? 'Payment completed' : 'Payment failed',
        };

        order.status = status;
        order.transactionId = transactionId;
        order.paymentGatewayResponse = JSON.stringify(params);
        order.statusHistory = [...(order.statusHistory || []), statusUpdate];

        if (isSuccess) {
          order.paymentCompletedAt = new Date();

          // Validate price consistency
          const expectedTotal = order.orderCourses.reduce(
            (sum, oc) => sum + Number(oc.price),
            0,
          );
          if (Math.abs(expectedTotal - Number(order.totalPrice)) > 0.01) {
            throw new BadRequestException('Price mismatch detected');
          }

          // Create enrollments in batch
          const enrollments = order.orderCourses.map((orderCourse) =>
            manager.create(Enrollment, {
              student: order.user,
              course: orderCourse.course,
              date_enrolled: new Date(),
            }),
          );

          // Check for existing enrollments before batch insert
          for (const enrollment of enrollments) {
            const existing = await manager.findOne(Enrollment, {
              where: {
                student: { id: order.user.id },
                course: { id: enrollment.course.id },
              },
            });
            if (existing) {
              throw new BadRequestException(
                `Already enrolled in course: ${enrollment.course.title}`,
              );
            }
          }

          await manager.save(Enrollment, enrollments);

          // Mark cart as checked out
          const cart = await manager.findOne(Cart, {
            where: { user: { id: order.user.id }, isCheckedOut: false },
            lock: { mode: 'pessimistic_write' },
          });

          if (cart) {
            cart.isCheckedOut = true;
            await manager.save(Cart, cart);
          }
        }

        return await manager.save(Order, order);
      } catch (error) {
        // Add failed status to history
        const failedStatusUpdate = {
          status: OrderStatus.FAILED,
          timestamp: new Date(),
          reason: `Processing failed: ${error.message}`,
        };

        if (order) {
          order.status = OrderStatus.FAILED;
          order.statusHistory = [
            ...(order.statusHistory || []),
            failedStatusUpdate,
          ];
          await manager.save(Order, order);
        }

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
      .innerJoinAndSelect('order.user', 'user');

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
    const sortField = validOrderByFields.includes(orderBy)
      ? orderBy
      : 'createdAt';

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
      .innerJoinAndSelect('order.user', 'user')
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
      relations: ['user', 'orderCourses', 'orderCourses.course'],
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

  async retryFailedEnrollments(): Promise<void> {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

    const stuckOrders = await this.orderRepository.find({
      where: {
        status: OrderStatus.COMPLETED,
        paymentCompletedAt: fiveMinutesAgo,
      },
      relations: ['user', 'orderCourses', 'orderCourses.course'],
    });

    for (const order of stuckOrders) {
      try {
        await this.dataSource.transaction(async (manager) => {
          const enrollmentsNeeded = [];

          for (const orderCourse of order.orderCourses) {
            const existingEnrollment = await manager.findOne(Enrollment, {
              where: {
                student: { id: order.user.id },
                course: { id: orderCourse.course.id },
              },
            });

            if (!existingEnrollment) {
              enrollmentsNeeded.push(
                manager.create(Enrollment, {
                  student: order.user,
                  course: orderCourse.course,
                  date_enrolled: new Date(),
                }),
              );
            }
          }

          if (enrollmentsNeeded.length > 0) {
            await manager.save(Enrollment, enrollmentsNeeded);

            // Update status history
            const statusUpdate = {
              status: OrderStatus.COMPLETED,
              timestamp: new Date(),
              reason: 'Enrollments retried and completed',
            };

            order.statusHistory = [
              ...(order.statusHistory || []),
              statusUpdate,
            ];
            await manager.save(Order, order);
          }
        });
      } catch (error) {
        console.error(
          `Failed to retry enrollments for order ${order.id}:`,
          error,
        );
      }
    }
  }

  async validateOrderIntegrity(orderId: string): Promise<{
    isValid: boolean;
    issues: string[];
  }> {
    const issues: string[] = [];

    const order = await this.findOne(orderId);

    if (!order) {
      return { isValid: false, issues: ['Order not found'] };
    }

    // Check if order courses exist
    if (!order.orderCourses || order.orderCourses.length === 0) {
      issues.push('Order has no associated courses');
    }

    // Check price consistency
    const totalFromCourses = order.orderCourses.reduce(
      (sum, oc) => sum + Number(oc.price),
      0,
    );

    if (Math.abs(totalFromCourses - Number(order.totalPrice)) > 0.01) {
      issues.push('Price mismatch between order total and course prices');
    }

    // Check enrollments for completed orders
    if (order.status === OrderStatus.COMPLETED) {
      for (const orderCourse of order.orderCourses) {
        const enrollment = await this.enrollmentRepository.findOne({
          where: {
            student: { id: order.user.id },
            course: { id: orderCourse.course.id },
          },
        });

        if (!enrollment) {
          issues.push(
            `Missing enrollment for course: ${orderCourse.course.title}`,
          );
        }
      }
    }

    return {
      isValid: issues.length === 0,
      issues,
    };
  }
}
