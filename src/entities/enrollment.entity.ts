import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { User } from './user.entity';
import { Course } from './course.entity';

@Entity()
export class Enrollment {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, (user) => user.enrollments)
  user: User;

  @ManyToOne(() => Course, (course) => course.enrollments)
  course: Course;

  @Column({ default: () => 'CURRENT_TIMESTAMP' })
  date_enrolled: Date;

  @Column({ default: 0 })
  progress: number;
}
