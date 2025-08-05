import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { User } from './user.entity';
import { Course } from './course.entity';

@Entity()
export class Review {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, (user) => user.reviews)
  user: User;

  @ManyToOne(() => Course, (course) => course.reviews)
  course: Course;

  @Column({ type: 'int', default: 0 })
  rating: number;

  @Column('text', { nullable: true })
  comment: string;

  @Column({ default: () => 'CURRENT_TIMESTAMP' })
  date_reviewed: Date;
}
