import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  ManyToMany,
  JoinTable,
  ManyToOne,
  DeleteDateColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Course } from './course.entity';
import { Enrollment } from './enrollment.entity';
import { Order } from './order.entity';
import { Subscription } from './subscription.entity';
import { Certification } from './certification.entity';
import { Review } from './review.entity';
import { Role } from './role.entity';
import { Cart } from './cart.entity';

@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: true, unique: true })
  googleId: string;

  @Column()
  name: string;

  @Column({ unique: true })
  email: string;

  @Column({ nullable: true })
  password: string;

  @CreateDateColumn()
  date_joined: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @DeleteDateColumn()
  deleted_at: Date;

  @Column({ nullable: true })
  bio: string;

  @Column({ default: false })
  has_active_subscription: boolean;

  @Column({ type: 'int', nullable: true })
  otp: number;

  @Column({ nullable: true })
  otpExpired: string;

  @Column({ type: 'boolean', nullable: true })
  isActive: boolean;

  @Column({ nullable: true })
  avatar_url: string;

  @ManyToOne(() => Role, (role) => role.users, { nullable: true })
  role: Role;

  @OneToMany(() => Course, (course) => course.instructor)
  courses: Course[];

  @OneToMany(() => Enrollment, (enrollment) => enrollment.student)
  enrollments: Enrollment[];

  @OneToMany(() => Order, (order) => order.user)
  orders: Order[];

  @OneToMany(() => Subscription, (subscription) => subscription.user)
  subscriptions: Subscription[];

  @OneToMany(() => Certification, (certification) => certification.user)
  certifications: Certification[];

  @OneToMany(() => Review, (review) => review.user)
  reviews: Review[];

  @OneToMany(() => Cart, (cart) => cart.user)
  carts: Cart[];
}
