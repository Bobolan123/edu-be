import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany } from 'typeorm';
import { User } from './user.entity';
import { Lesson } from './lesson.entity';
import { Enrollment } from './enrollment.entity';
import { Quiz } from './quiz.entity';
import { Review } from './review.entity';
import { Certification } from './certification.entity';
import { Payment } from './payment.entity';

@Entity()
export class Course {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  title: string;

  @Column('text')
  description: string;

  @ManyToOne(() => User, (user) => user.courses)
  instructor: User;

  @Column()
  category: string;

  @Column()
  duration: string;

  @Column({ default: () => 'CURRENT_TIMESTAMP' })
  date_created: Date;

  @Column({ nullable: true })
  thumbnail: string;

  @Column({ default: 0 })
  price: number;

  @OneToMany(() => Lesson, (lesson) => lesson.course)
  lessons: Lesson[];

  @OneToMany(() => Enrollment, (enrollment) => enrollment.course)
  enrollments: Enrollment[];

  @OneToMany(() => Quiz, (quiz) => quiz.course)
  quizzes: Quiz[];

  @OneToMany(() => Review, (review) => review.course)
  reviews: Review[];

  @OneToMany(() => Certification, (certification) => certification.course)
  certifications: Certification[];

  @OneToMany(() => Payment, (payment) => payment.course)
  payments: Payment[];
}
