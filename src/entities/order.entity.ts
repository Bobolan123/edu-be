import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';
import { Cart } from './cart.entity';
import { OrderCourse } from './order-course.entity';

export enum OrderStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

export enum PaymentMethod {
  VNPAY = 'VNPAY',
}

@Entity()
export class Order {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('decimal', { precision: 10, scale: 2 })
  totalPrice: number;

  @Column({
    type: 'enum',
    enum: OrderStatus,
    default: OrderStatus.PENDING,
  })
  status: OrderStatus;

  @Column({
    type: 'enum',
    enum: PaymentMethod,
    default: PaymentMethod.VNPAY,
  })
  paymentMethod: PaymentMethod;

  @Column({ nullable: true })
  transactionId: string;

  @Column({ type: 'text', nullable: true })
  paymentGatewayResponse: string;

  @Column({ unique: true, nullable: true })
  idempotencyKey: string;

  @Column({ type: 'timestamp', nullable: true })
  paymentInitiatedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  paymentCompletedAt: Date;

  @Column({ type: 'json', nullable: true })
  statusHistory: { status: OrderStatus; timestamp: Date; reason?: string }[];

  @ManyToOne(() => User, (user) => user.orders, { onDelete: 'CASCADE' })
  user: User;

  @OneToMany(() => OrderCourse, (orderCourse) => orderCourse.order, {
    cascade: true,
  })
  orderCourses: OrderCourse[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
