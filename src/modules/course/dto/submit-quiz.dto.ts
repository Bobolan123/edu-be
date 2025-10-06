import { IsNotEmpty, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class QuizAnswerDto {
  @IsNotEmpty()
  questionId: string;

  @IsNotEmpty()
  answer: string | number | boolean;
}

export class SubmitQuizDto {
  @IsNotEmpty()
  lectureId: string;

  @IsNotEmpty()
  enrollmentId: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuizAnswerDto)
  answers: QuizAnswerDto[];
}
