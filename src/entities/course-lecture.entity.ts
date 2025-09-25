import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { CourseSection } from './course-section.entity';
import { VideoContent, QuizContent } from '../interfaces/course-content.interface';

@Entity()
export class CourseLecture {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column('text', { nullable: true })
  description: string;

  @Column('enum', { enum: ['video', 'quiz'] })
  contentType: 'video' | 'quiz';

  @Column('int')
  orderIndex: number;

  @Column('int', { default: 0 })
  durationSeconds: number;

  @Column('boolean', { default: false })
  isPreview: boolean;

  @ManyToOne(() => CourseSection, (section) => section.lectures, { onDelete: 'CASCADE' })
  section: CourseSection;

  @Column('jsonb')
  content: VideoContent | QuizContent;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}