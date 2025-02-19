import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { User } from './user.entity';
import { Course } from './course.entity';

@Entity()
export class Payment {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, (user) => user.payments)
  user: User;

  @ManyToOne(() => Course, (course) => course.payments)
  course: Course;

  @Column()
  amount: number;

  @Column()
  payment_method: string;

  @Column({ default: 'pending' })
  payment_status: string;

  @Column({ default: () => 'CURRENT_TIMESTAMP' })
  transaction_date: Date;

  @Column({ nullable: true })
  receipt_url: string;
}
