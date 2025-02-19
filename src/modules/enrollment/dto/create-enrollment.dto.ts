import { IsInt, IsOptional } from 'class-validator';

export class CreateEnrollmentDto {
  @IsInt()
  courseId: number;

  @IsInt()
  userId: number;

  @IsInt()
  @IsOptional()
  progress?: number;
}