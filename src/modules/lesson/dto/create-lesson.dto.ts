import { IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateLessonDto {
  @IsInt()
  courseId: number;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  content: string;

  @IsInt()
  order: number;

  @IsString()
  @IsOptional()
  resources?: string;
}