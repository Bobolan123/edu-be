import { Controller, Get, Post, Put, Delete, Body, Param, ParseIntPipe, Query } from '@nestjs/common';
import { SubscriptionService } from './subscription.service';
import { Subscription } from 'src/entities/subscription.entity';
import { PageOptionsDto } from 'src/common/dtos/page-option.dto';
import { ResponsePaginate } from 'src/common/dtos/response-paginate.dto';

@Controller('subscriptions')
export class SubscriptionController {
  constructor(private readonly subscriptionService: SubscriptionService) {}

  @Get()
  findAll(@Query() pageOptionsDto: PageOptionsDto): Promise<ResponsePaginate<Subscription>> {
    return this.subscriptionService.findAll(pageOptionsDto);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number): Promise<Subscription> {
    return this.subscriptionService.findOne(id);
  }

  @Post()
  create(@Body() subscription: Partial<Subscription>): Promise<Subscription> {
    return this.subscriptionService.create(subscription);
  }

  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() subscription: Partial<Subscription>,
  ): Promise<Subscription> {
    return this.subscriptionService.update(id, subscription);
  }

  @Delete(':id')
  delete(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.subscriptionService.delete(id);
  }

  @Get('user/:userId')
  findByUser(
    @Param('userId', ParseIntPipe) userId: number,
    @Query() pageOptionsDto: PageOptionsDto,
  ): Promise<ResponsePaginate<Subscription>> {
    return this.subscriptionService.findByUser(userId, pageOptionsDto);
  }

  @Get('user/:userId/active')
  findActiveSubscription(@Param('userId', ParseIntPipe) userId: number): Promise<Subscription> {
    return this.subscriptionService.findActiveSubscription(userId);
  }
} 