import { Controller, Get, Post, Param, Body, ParseIntPipe } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { Payment } from 'src/entities/payment.entity';

@Controller('payments')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Get()
  findAll(): Promise<Payment[]> {
    return this.paymentService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number): Promise<Payment> {
    return this.paymentService.findOne(id);
  }

  @Post()
  create(@Body() payment: Partial<Payment>): Promise<Payment> {
    return this.paymentService.create(payment);
  }

  @Get('user/:userId')
  findByUser(@Param('userId', ParseIntPipe) userId: number): Promise<Payment[]> {
    return this.paymentService.findByUser(userId);
  }

  @Get('course/:courseId')
  findByCourse(@Param('courseId', ParseIntPipe) courseId: number): Promise<Payment[]> {
    return this.paymentService.findByCourse(courseId);
  }

  @Post('process')
  processPayment(@Body() payment: Partial<Payment>): Promise<Payment> {
    return this.paymentService.processPayment(payment);
  }
} 