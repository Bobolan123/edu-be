import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Subscription } from 'src/entities/subscription.entity';

@Injectable()
export class SubscriptionService {
  constructor(
    @InjectRepository(Subscription)
    private subscriptionRepository: Repository<Subscription>,
  ) {}

  async findAll(): Promise<Subscription[]> {
    return this.subscriptionRepository.find({
      relations: ['user'],
    });
  }

  async findOne(id: number): Promise<Subscription> {
    return this.subscriptionRepository.findOne({
      where: { id },
      relations: ['user'],
    });
  }

  async create(subscription: Partial<Subscription>): Promise<Subscription> {
    const newSubscription = this.subscriptionRepository.create(subscription);
    return this.subscriptionRepository.save(newSubscription);
  }

  async update(
    id: number,
    subscription: Partial<Subscription>,
  ): Promise<Subscription> {
    await this.subscriptionRepository.update(id, subscription);
    return this.findOne(id);
  }

  async delete(id: number): Promise<void> {
    await this.subscriptionRepository.delete(id);
  }

  async findByUser(userId: number): Promise<Subscription[]> {
    return this.subscriptionRepository.find({
      where: { user: { id: userId } },
      relations: ['user'],
    });
  }

  async findActiveSubscription(userId: number): Promise<Subscription> {
    return this.subscriptionRepository.findOne({
      where: {
        user: { id: userId },
      },
      relations: ['user'],
    });
  }
}
