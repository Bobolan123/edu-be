import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  ManyToMany,
  JoinTable,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

import { User } from './user.entity';
import { Enrollment } from './enrollment.entity';
import { Review } from './review.entity';
import { Certification } from './certification.entity';
import { Payment } from './payment.entity';
import { Category } from './category.entity';

@Entity()
export class Course {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text' })
  description: string;

  @ManyToOne(() => User, (user) => user.courses, {
    eager: true,
    onDelete: 'CASCADE',
  })
  instructor: User;

  @Column({ type: 'int', default: 0 }) // Total course duration in minutes
  duration: number;

  @CreateDateColumn()
  date_created: Date;

  @UpdateDateColumn()
  last_updated: Date;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  price: number;

  @Column({ type: 'float', default: 0 })
  average_rating: number;

  @Column({ type: 'int', default: 0 })
  total_reviews: number;

  @OneToMany(() => Enrollment, (enrollment) => enrollment.course)
  enrollments: Enrollment[];

  @OneToMany(() => Review, (review) => review.course)
  reviews: Review[];

  @OneToMany(() => Certification, (certification) => certification.course)
  certifications: Certification[];

  @OneToMany(() => Payment, (payment) => payment.course)
  payments: Payment[];

  @ManyToMany(() => Category, (category) => category.courses, { cascade: true })
  @JoinTable()
  categories: Category[];

  @Column({ nullable: true })
  thumbnail_url: string;
}
