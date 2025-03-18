import { IsInt, IsNotEmpty, IsOptional, IsString, IsUrl, Min } from 'class-validator';

export class CreateLessonDto {
  @IsInt()
  @IsNotEmpty()
  sectionId: number; // Lessons belong to Sections

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsOptional()
  description?: string; // Matches Lesson entity

  @IsUrl()
  @IsNotEmpty()
  videoUrl: string; // Added to store lesson video link

  @IsInt()
  @Min(1)
  order: number;

  @IsInt()
  @IsNotEmpty()
  duration: number; 

  @IsString()
  @IsOptional()
  resources?: string;
}
