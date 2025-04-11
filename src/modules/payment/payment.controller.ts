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
import { PaymentService } from './payment.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { Payment, PaymentMethod, PaymentStatus } from '../../entities/payment.entity';
import { Request } from 'express';
import { User } from '../../entities/user.entity';
import { PageOptionsDto } from 'src/common/dtos';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { Response } from 'express';
import { Public } from 'src/auth/Public';

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
    return this.paymentService.createPayment(
      createPaymentDto,
      req.user.id.toString(),
    );
  }

  @Public()
  @Get('vnpay-return')
async handleVnpayReturn(@Query() query: any, @Res() res: Response) {
  const result = await this.paymentService.handlePaymentCallback(PaymentMethod.VNPAY, query);

  if (result.status === PaymentStatus.COMPLETED) {

    return res.redirect(`${process.env.FRONTEND_URL}/payment/success?orderId=${result.id}`);
  } else {
    return res.redirect(`${process.env.FRONTEND_URL}/payment/failed`);
  }
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
    return this.paymentService.findByUser(
      req.user.id.toString(),
      pageOptionsDto,
    );
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
