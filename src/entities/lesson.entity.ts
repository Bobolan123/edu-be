import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { Course } from './course.entity';

@Entity()
export class Lesson {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Course, (course) => course.lessons)
  course: Course;

  @Column()
  title: string;

  @Column('text')
  content: string;

  @Column()
  order: number;

  @Column({ nullable: true })
  resources: string;
}
