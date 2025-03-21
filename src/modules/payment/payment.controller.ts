import { Controller, Post, Get, Body, Query, Param, UseGuards, Req } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Payment, PaymentMethod } from '../../entities/payment.entity';
import { Request } from 'express';
import { User } from '../../entities/user.entity';
import { PageOptionsDto } from 'src/common/dtos';

interface RequestWithUser extends Request {
  user: User;
}

@Controller('payments')
@UseGuards(JwtAuthGuard)
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post()
  async createPayment(
    @Body() createPaymentDto: CreatePaymentDto,
    @Req() req: RequestWithUser,
  ): Promise<Payment & { paymentUrl: string }> {
    return this.paymentService.createPayment(createPaymentDto, req.user.id.toString());
  }

  @Get()
  async findAll(@Query() pageOptionsDto: PageOptionsDto) {
    return this.paymentService.findAll(pageOptionsDto);
  }

  @Get('user')
  async findByUser(
    @Query() pageOptionsDto: PageOptionsDto,
    @Req() req: RequestWithUser,
  ) {
    return this.paymentService.findByUser(req.user.id.toString(), pageOptionsDto);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.paymentService.findOne(id);
  }

  @Post('callback/:method')
  async handlePaymentCallback(
    @Param('method') method: PaymentMethod,
    @Body() params: any,
  ) {
    return this.paymentService.handlePaymentCallback(method, params);
  }
} 