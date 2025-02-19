import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Course } from 'src/entities/course.entity';
import { Question } from 'src/entities/question.entity';
import { Quiz } from 'src/entities/quiz.entity';
import { QuizSubmission } from 'src/entities/quiz_submission.entity';
import { QuizController } from './quiz.controller';
import { QuizService } from './quiz.service';

@Module({
  imports: [TypeOrmModule.forFeature([Quiz, Question, QuizSubmission, Course])],
  controllers: [QuizController],
  providers: [QuizService],
  exports: [QuizService],
})
export class QuizzesModule {}