import { IsInt, IsOptional, IsString, Min, Max, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { ReviewStatus } from '../../../entities/review.entity';

export class UpdateReviewDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  @IsOptional()
  rating?: number;

  @IsString()
  @IsOptional()
  comment?: string;

  @IsEnum(ReviewStatus)
  @IsOptional()
  status?: ReviewStatus;

  @Type(() => Number)
  @IsInt()
  @IsOptional()
  upVotes?: number;

  @Type(() => Number)
  @IsInt()
  @IsOptional()
  downVotes?: number;
}
