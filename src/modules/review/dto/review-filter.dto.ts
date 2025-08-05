import { IsEnum, IsOptional, IsArray, IsInt, IsString, Min, Max } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { PageOptionsDto } from 'src/common/dtos/page-option.dto';

export enum ReviewSortBy {
  NEWEST = 'newest',
  OLDEST = 'oldest',
  HIGHEST_RATING = 'highest_rating',
  LOWEST_RATING = 'lowest_rating',
}

export class ReviewFilterDto extends PageOptionsDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  @IsOptional() 
  rating?: number;

  @IsEnum(ReviewSortBy)
  @IsOptional()
  sortBy?: ReviewSortBy = ReviewSortBy.NEWEST;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  @IsOptional()
  minRating?: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  @IsOptional()
  maxRating?: number;

  @IsString()
  @IsOptional()
  search?: string;
}
