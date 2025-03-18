import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { QuizSubmission } from 'src/entities/quiz_submission.entity';
import { QuizSubmissionService } from './quiz-submission.service';
import { QuizSubmissionController } from './quiz-submission.controller';

@Module({
  imports: [TypeOrmModule.forFeature([QuizSubmission])],
  exports: [QuizSubmissionService],
  controllers: [QuizSubmissionController],
  providers: [QuizSubmissionService],
})
export class QuizSubmissionModule {} 