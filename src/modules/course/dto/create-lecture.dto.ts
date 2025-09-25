import { IsString, IsOptional, IsEnum, IsInt, Min, IsBoolean, IsObject } from 'class-validator';
import { VideoContent, QuizContent } from '../../../interfaces/course-content.interface';

export class CreateLectureDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsEnum(['video', 'quiz'])
  contentType: 'video' | 'quiz';

  @IsOptional()
  @IsInt()
  @Min(0)
  orderIndex?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  durationSeconds?: number;

  @IsOptional()
  @IsBoolean()
  isPreview?: boolean;

  @IsObject()
  content: VideoContent | QuizContent;
}