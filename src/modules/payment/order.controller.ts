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
import {
  PaymentMethod,
  Order,
  OrderStatus,
} from '../../entities/order.entity';
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

    if (result.status === OrderStatus.COMPLETED) {
      return res.redirect(
        `${process.env.FRONTEND_URL}/payment/success?orderId=${result.id}`,
      );
    } else {
      return res.redirect(`${process.env.FRONTEND_URL}/payment/failed`);
    }
  }

  @Public()
  @Get('paypal-return')
  async handlePaypalReturn(@Query() query: any, @Res() res: Response) {
    const result = await this.orderService.handlePaymentCallback(
      PaymentMethod.PAYPAL,
      query,
    );

    if (result.status === OrderStatus.COMPLETED) {
      return res.redirect(
        `${process.env.FRONTEND_URL}/payment/success?orderId=${result.id}`,
      );
    } else {
      return res.redirect(`${process.env.FRONTEND_URL}/payment/failed`);
    }
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
    return this.orderService.findByUser(
      req.user.id.toString(),
      pageOptionsDto,
    );
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
