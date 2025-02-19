import { IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class CreateQuizDto {
  @IsNumber()
  @IsNotEmpty()
  courseId: number;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsNumber()
  @IsNotEmpty()
  total_questions: number;
}
