import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { User } from './user.entity';
import { Quiz } from './quiz.entity';

@Entity()
export class QuizSubmission {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, (user) => user.quiz_submissions)
  user: User;

  @ManyToOne(() => Quiz, (quiz) => quiz.submissions)
  quiz: Quiz;

  @Column()
  score: number;

  @Column({ default: () => 'CURRENT_TIMESTAMP' })
  date_submitted: Date;
}
