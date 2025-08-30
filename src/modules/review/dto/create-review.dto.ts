import { IsInt, IsOptional, IsString, Min, Max, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { ReviewStatus } from '../../../entities/review.entity';

export class CreateReviewDto {
  @Type(() => Number)
  @IsInt()
  userId: number;

  @Type(() => Number)
  @IsInt()
  courseId: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  rating: number;

  @IsString()
  @IsOptional()
  comment?: string;

  @IsEnum(ReviewStatus)
  @IsOptional()
  status?: ReviewStatus;
}
