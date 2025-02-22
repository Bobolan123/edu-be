import { Entity, PrimaryGeneratedColumn, Column, OneToMany, ManyToMany, JoinTable, ManyToOne } from 'typeorm';
import { Course } from './course.entity';
import { Enrollment } from './enrollment.entity';
import { Payment } from './payment.entity';
import { Subscription } from './subscription.entity';
import { Certification } from './certification.entity';
import { Review } from './review.entity';
import { QuizSubmission } from './quiz_submission.entity';
import { Role } from './role.entity';

@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ unique: true })
  email: string;

  @Column()
  password: string;

  @Column({ default: () => 'CURRENT_TIMESTAMP' })
  date_joined: Date;

  @Column({ nullable: true })
  profile_picture: string;

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

  @ManyToOne(() => Role, (role) => role.users)
  role: Role;

  @OneToMany(() => Course, (course) => course.instructor)
  courses: Course[];

  @OneToMany(() => Enrollment, (enrollment) => enrollment.user)
  enrollments: Enrollment[];

  @OneToMany(() => Payment, (payment) => payment.user)
  payments: Payment[];

  @OneToMany(() => Subscription, (subscription) => subscription.user)
  subscriptions: Subscription[];

  @OneToMany(() => Certification, (certification) => certification.user)
  certifications: Certification[];

  @OneToMany(() => Review, (review) => review.user)
  reviews: Review[];


  @OneToMany(() => QuizSubmission, (quizSubmission) => quizSubmission.id)
  quiz_submissions: QuizSubmission[];

}
