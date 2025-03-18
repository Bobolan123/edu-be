import { Controller, Get, Post, Body, Param, ParseIntPipe, Query } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { Payment } from 'src/entities/payment.entity';
import { PageOptionsDto } from 'src/common/dtos/page-option.dto';
import { ResponsePaginate } from 'src/common/dtos/response-paginate.dto';

@Controller('payments')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Get()
  findAll(@Query() pageOptionsDto: PageOptionsDto): Promise<ResponsePaginate<Payment>> {
    return this.paymentService.findAll(pageOptionsDto);
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
  findByUser(
    @Param('userId', ParseIntPipe) userId: number,
    @Query() pageOptionsDto: PageOptionsDto,
  ): Promise<ResponsePaginate<Payment>> {
    return this.paymentService.findByUser(userId, pageOptionsDto);
  }

  @Get('course/:courseId')
  findByCourse(
    @Param('courseId', ParseIntPipe) courseId: number,
    @Query() pageOptionsDto: PageOptionsDto,
  ): Promise<ResponsePaginate<Payment>> {
    return this.paymentService.findByCourse(courseId, pageOptionsDto);
  }

  @Post('process')
  processPayment(@Body() payment: Partial<Payment>): Promise<Payment> {
    return this.paymentService.processPayment(payment);
  }
} 