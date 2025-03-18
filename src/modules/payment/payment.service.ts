import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Payment } from 'src/entities/payment.entity';

@Injectable()
export class PaymentService {
  constructor(
    @InjectRepository(Payment)
    private paymentRepository: Repository<Payment>,
  ) {}

  async findAll(): Promise<Payment[]> {
    return this.paymentRepository.find({
      relations: ['user', 'course'],
    });
  }

  async findOne(id: number): Promise<Payment> {
    return this.paymentRepository.findOne({
      where: { id },
      relations: ['user', 'course'],
    });
  }

  async create(payment: Partial<Payment>): Promise<Payment> {
    const newPayment = this.paymentRepository.create(payment);
    return this.paymentRepository.save(newPayment);
  }

  async findByUser(userId: number): Promise<Payment[]> {
    return this.paymentRepository.find({
      where: { user: { id: userId } },
      relations: ['user', 'course'],
    });
  }

  async findByCourse(courseId: number): Promise<Payment[]> {
    return this.paymentRepository.find({
      where: { course: { id: courseId } },
      relations: ['user', 'course'],
    });
  }

  async processPayment(payment: Partial<Payment>): Promise<Payment> {
    // Here you would typically integrate with a payment gateway
    // For now, we'll just create a payment record
    return this.create(payment);
  }
} 