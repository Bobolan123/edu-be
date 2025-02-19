import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany } from 'typeorm';
import { Course } from './course.entity';
import { Question } from './question.entity';
import { QuizSubmission } from './quiz_submission.entity';

@Entity()
export class Quiz {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Course, (course) => course.quizzes)
  course: Course;

  @Column()
  title: string;

  @Column()
  total_questions: number;

  @OneToMany(() => Question, (question) => question.quiz)
  questions: Question[];

  @OneToMany(() => QuizSubmission, (submission) => submission.quiz)
  submissions: QuizSubmission[];
}
