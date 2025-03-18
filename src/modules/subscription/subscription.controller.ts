import { Controller, Get, Post, Put, Delete, Body, Param, ParseIntPipe } from '@nestjs/common';
import { SubscriptionService } from './subscription.service';
import { Subscription } from 'src/entities/subscription.entity';

@Controller('subscriptions')
export class SubscriptionController {
  constructor(private readonly subscriptionService: SubscriptionService) {}

  @Get()
  findAll(): Promise<Subscription[]> {
    return this.subscriptionService.findAll();
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
  findByUser(@Param('userId', ParseIntPipe) userId: number): Promise<Subscription[]> {
    return this.subscriptionService.findByUser(userId);
  }

  @Get('user/:userId/active')
  findActiveSubscription(@Param('userId', ParseIntPipe) userId: number): Promise<Subscription> {
    return this.subscriptionService.findActiveSubscription(userId);
  }
} 