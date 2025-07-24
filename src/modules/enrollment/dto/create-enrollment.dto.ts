import { IsInt } from 'class-validator';

export class CreateEnrollmentDto {
  @IsInt()
  courseId: number;

  @IsInt()
  userId: number;
}
