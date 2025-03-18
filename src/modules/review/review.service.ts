import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Review } from 'src/entities/review.entity';

@Injectable()
export class ReviewService {
  constructor(
    @InjectRepository(Review)
    private reviewRepository: Repository<Review>,
  ) {}

  async findAll(): Promise<Review[]> {
    return this.reviewRepository.find({
      relations: ['user', 'course'],
    });
  }

  async findOne(id: number): Promise<Review> {
    return this.reviewRepository.findOne({
      where: { id },
      relations: ['user', 'course'],
    });
  }

  async create(review: Partial<Review>): Promise<Review> {
    const newReview = this.reviewRepository.create(review);
    return this.reviewRepository.save(newReview);
  }

  async update(id: number, review: Partial<Review>): Promise<Review> {
    await this.reviewRepository.update(id, review);
    return this.reviewRepository.findOne({
      where: { id },
      relations: ['user', 'course'],
    });
  }

  async delete(id: number): Promise<void> {
    await this.reviewRepository.delete(id);
  }

  async findByCourse(courseId: number): Promise<Review[]> {
    return this.reviewRepository.find({
      where: { course: { id: courseId } },
      relations: ['user', 'course'],
    });
  }

  async findByUser(userId: number): Promise<Review[]> {
    return this.reviewRepository.find({
      where: { user: { id: userId } },
      relations: ['user', 'course'],
    });
  }
} 