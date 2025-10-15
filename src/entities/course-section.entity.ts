import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Course } from './course.entity';
import { CourseLecture } from './course-lecture.entity';

@Entity()
export class CourseSection {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column('text', { nullable: true })
  description: string;

  @Column('int')
  orderIndex: number;

  @ManyToOne(() => Course, (course) => course.sections, { onDelete: 'CASCADE' })
  course: Course;

  @OneToMany(() => CourseLecture, (lecture) => lecture.section)
  lectures: CourseLecture[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
