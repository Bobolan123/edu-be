import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Subscription } from 'src/entities/subscription.entity';
import { PageOptionsDto } from 'src/common/dtos/page-option.dto';
import { PageMetaDto } from 'src/common/dtos/page-meta.dto';
import { ResponsePaginate } from 'src/common/dtos/response-paginate.dto';

@Injectable()
export class SubscriptionService {
  constructor(
    @InjectRepository(Subscription)
    private subscriptionRepository: Repository<Subscription>,
  ) {}

  async findAll(
    pageOptionsDto: PageOptionsDto,
  ): Promise<ResponsePaginate<Subscription>> {
    const queryBuilder = this.subscriptionRepository
      .createQueryBuilder('subscription')
      .leftJoinAndSelect('subscription.user', 'user');

    if (pageOptionsDto.search) {
      queryBuilder.where('user.name LIKE :search', {
        search: `%${pageOptionsDto.search}%`,
      });
    }

    queryBuilder
      .orderBy(`subscription.${pageOptionsDto.orderBy}`, pageOptionsDto.order)
      .skip(pageOptionsDto.skip)
      .take(pageOptionsDto.take);

    const [items, itemCount] = await queryBuilder.getManyAndCount();

    const pageMetaDto = new PageMetaDto({
      itemCount,
      pageOptionsDto,
    });

    return { result: items, meta: pageMetaDto };
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

  async findByUser(
    userId: number,
    pageOptionsDto: PageOptionsDto,
  ): Promise<ResponsePaginate<Subscription>> {
    const queryBuilder = this.subscriptionRepository
      .createQueryBuilder('subscription')
      .leftJoinAndSelect('subscription.user', 'user')
      .where('user.id = :userId', { userId });

    if (pageOptionsDto.search) {
      queryBuilder.andWhere('subscription.type LIKE :search', {
        search: `%${pageOptionsDto.search}%`,
      });
    }

    queryBuilder
      .orderBy(`subscription.${pageOptionsDto.orderBy}`, pageOptionsDto.order)
      .skip(pageOptionsDto.skip)
      .take(pageOptionsDto.take);

    const [items, itemCount] = await queryBuilder.getManyAndCount();

    const pageMetaDto = new PageMetaDto({
      itemCount,
      pageOptionsDto,
    });

    return { result: items, meta: pageMetaDto };
  }

  async findActiveSubscription(userId: number): Promise<Subscription> {
    return this.subscriptionRepository.findOne({
      where: {
        user: { id: userId },
        status: 'active',
      },
      relations: ['user'],
    });
  }
}
