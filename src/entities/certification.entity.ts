import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { User } from './user.entity';
import { Course } from './course.entity';

@Entity()
export class Certification {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, (user) => user.certifications)
  user: User;

  @ManyToOne(() => Course, (course) => course.certifications)
  course: Course;

  @Column({ default: () => 'CURRENT_TIMESTAMP' })
  date_awarded: Date;

  @Column({ nullable: true })
  certificate_url: string;
}
