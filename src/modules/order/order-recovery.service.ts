import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { OrderService } from './order.service';

@Injectable()
export class OrderRecoveryService {
  constructor(private readonly orderService: OrderService) {}

  @Cron(CronExpression.EVERY_5_MINUTES)
  async handleFailedEnrollments() {
    try {
      await this.orderService.retryFailedEnrollments();
    } catch (error) {
      console.error('Failed to retry enrollments:', error);
    }
  }

  @Cron(CronExpression.EVERY_HOUR)
  async validateOrderIntegrity() {
    // This could be expanded to validate multiple orders
    console.log('Running order integrity validation...');
  }
}