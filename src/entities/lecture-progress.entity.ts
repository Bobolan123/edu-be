import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  Unique,
} from 'typeorm';
import { Enrollment } from './enrollment.entity';
import { CourseLecture } from './course-lecture.entity';

export interface QuizSubmission {
  answers: Array<{
    questionId: string;
    answer: string | number | boolean;
  }>;
  results: Array<{
    questionId: string;
    isCorrect: boolean;
    correctAnswer: string | number;
    explanation?: string;
    points: number;
  }>;
}

@Entity('lecture_progress')
@Unique(['enrollmentId', 'lectureId'])
@Index(['enrollmentId', 'isCompleted'])
@Index(['enrollmentId', 'lectureId'])
export class LectureProgress {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  enrollmentId: number;

  @ManyToOne(() => Enrollment, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'enrollmentId' })
  enrollment: Enrollment;

  @Column()
  courseId: number;

  @Column('uuid')
  lectureId: string;

  @Column({ type: 'boolean', nullable: true, default: null })
  isCompleted: boolean | null;

  @Column('int', { default: 0 })
  watchTimeSeconds: number;

  @Column('int', { nullable: true })
  lastPositionSeconds: number;

  @Column('jsonb', { nullable: true })
  submissionData: {
    attempts: number;
    score?: number;
    percentage?: number;
    passed?: boolean;
    lastSubmission?: QuizSubmission;
    completedAt?: Date;
  };

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => CourseLecture, { onDelete: 'CASCADE' })
  lecture: CourseLecture;
}
