import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  Param,
  UseGuards,
  Req,
  Res,
} from '@nestjs/common';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderInfoDto } from './dto/order-info.dto';
import { PaymentMethod, Order, OrderStatus } from '../../entities/order.entity';
import { Request, Response } from 'express';
import { User } from '../../entities/user.entity';
import { PageOptionsDto } from 'src/common/dtos';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { Public } from 'src/auth/Public';
import { OrderService } from './order.service';

interface RequestWithUser extends Request {
  user: User;
}

@Controller('orders')
@UseGuards(JwtAuthGuard)
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @Post()
  async createOrder(
    @Body() createOrderDto: CreateOrderDto,
    @Req() req: RequestWithUser,
  ): Promise<Order & { paymentUrl: string }> {
    return this.orderService.createOrder(
      createOrderDto,
      +req.user.id.toString(),
    );
  }

  @Public()
  @Get('vnpay-return')
  async handleVnpayReturn(@Query() query: any, @Res() res: Response) {
    const result = await this.orderService.handlePaymentCallback(
      PaymentMethod.VNPAY,
      query,
    );

    const params = new URLSearchParams({
      orderId: result.id,
      price: result.totalPrice.toString(),
      status: result.status,
      method: result.paymentMethod,
      date: result.updatedAt.toISOString(),
      ...(result.transactionId && { transactionId: result.transactionId }),
    });

    if (result.status === OrderStatus.COMPLETED) {
      return res.redirect(`${process.env.FRONTEND_URL}/payment/success?${params}`);
    } else {
      return res.redirect(`${process.env.FRONTEND_URL}/payment/failed?${params}`);
    }
  }

  @Public()
  @Get('paypal-return')
  async handlePaypalReturn(@Query() query: any, @Res() res: Response) {
    const result = await this.orderService.handlePaymentCallback(
      PaymentMethod.PAYPAL,
      query,
    );

    const params = new URLSearchParams({
      orderId: result.id,
      price: result.totalPrice.toString(),
      status: result.status,
      method: result.paymentMethod,
      date: result.updatedAt.toISOString(),
      ...(result.transactionId && { transactionId: result.transactionId }),
    });

    if (result.status === OrderStatus.COMPLETED) {
      return res.redirect(`${process.env.FRONTEND_URL}/payment/success?${params}`);
    } else {
      return res.redirect(`${process.env.FRONTEND_URL}/payment/failed?${params}`);
    }
  }

  @Public()
  @Get('vnpay-cancel')
  async handleVnpayCancel(@Query() query: any, @Res() res: Response) {
    let result = null;
    if (query.vnp_TxnRef) {
      try {
        result = await this.orderService.updateOrderStatus(
          query.vnp_TxnRef,
          OrderStatus.FAILED,
          query,
        );
      } catch (error) {
        // Order not found or already processed
      }
    }

    const params = new URLSearchParams({
      reason: 'cancelled',
      ...(result && {
        orderId: result.id,
        price: result.totalPrice.toString(),
        status: result.status,
        method: result.paymentMethod,
        date: result.updatedAt.toISOString(),
      }),
    });

    return res.redirect(`${process.env.FRONTEND_URL}/payment/failed?${params}`);
  }

  @Public()
  @Get('paypal-cancel')
  async handlePaypalCancel(@Res() res: Response) {
    return res.redirect(`${process.env.FRONTEND_URL}/payment/failed`);
  }

  @Get()
  async findAll(@Query() pageOptionsDto: PageOptionsDto) {
    return this.orderService.findAll(pageOptionsDto);
  }

  @Get('user')
  async findByUser(
    @Query() pageOptionsDto: PageOptionsDto,
    @Req() req: RequestWithUser,
  ) {
    return this.orderService.findByUser(req.user.id.toString(), pageOptionsDto);
  }

  @Public()
  @Get('info/:id')
  async getOrderInfo(@Param('id') id: string): Promise<OrderInfoDto> {
    const order = await this.orderService.findOne(id);
    return {
      id: order.id,
      totalPrice: order.totalPrice,
      status: order.status,
      paymentMethod: order.paymentMethod,
      transactionId: order.transactionId,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
    };
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.orderService.findOne(id);
  }

  @Post('callback/:method')
  async handlePaymentCallback(
    @Param('method') method: PaymentMethod,
    @Body() params: any,
  ) {
    return this.orderService.handlePaymentCallback(method, params);
  }
}
