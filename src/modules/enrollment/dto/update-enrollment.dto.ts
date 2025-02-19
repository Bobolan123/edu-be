import { IsInt, IsOptional } from 'class-validator';

export class UpdateEnrollmentDto {
    @IsInt()
    @IsOptional()
    progress?: number;
  }
  