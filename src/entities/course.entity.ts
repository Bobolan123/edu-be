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
  DeleteDateColumn,
} from 'typeorm';

import { User } from './user.entity';
import { Enrollment } from './enrollment.entity';
import { Review } from './review.entity';
import { Certification } from './certification.entity';
import { Category } from './category.entity';

@Entity()
export class Course {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  language: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  preview_url: string;

  @Column({ type: 'boolean', nullable: true })
  isActive: boolean;

  @Column({ type: 'text' })
  description: string;

  @ManyToOne(() => User, (user) => user.courses, {
    eager: true,
    onDelete: 'CASCADE',
  })
  instructor: User;

  @CreateDateColumn()
  date_created: Date;

  @UpdateDateColumn()
  last_updated: Date;

  @DeleteDateColumn()
  deleted_at: Date;

  @Column({ type: 'int', default: 0 })
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

  @ManyToMany(() => Category, (category) => category.courses, {
    cascade: true,
    onDelete: 'CASCADE',
  })
  @JoinTable()
  categories: Category[];

  @Column({ nullable: true })
  thumbnail_url: string;
}
