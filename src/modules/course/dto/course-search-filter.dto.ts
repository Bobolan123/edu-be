import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
  Max,
  IsNumber,
} from 'class-validator';
import { Order } from '../../../common/constants';

export class CourseSearchFilterDto {
  @IsString()
  @IsOptional()
  search?: string;

  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(5)
  @IsOptional()
  minRating?: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(5)
  @IsOptional()
  maxRating?: number;

  @Type(() => Number)
  @IsInt()
  @IsOptional()
  instructorId?: number;

  @Type(() => Number)
  @IsInt()
  @IsOptional()
  userId?: number;

  @Transform(({ value }) =>
    value ? (Array.isArray(value) ? value.map(Number) : [Number(value)]) : [],
  )
  @IsArray()
  @IsOptional()
  categoryIds?: number[];

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @IsOptional()
  minPrice?: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @IsOptional()
  maxPrice?: number;

  @IsEnum(Order)
  @IsOptional()
  order?: Order = Order.DESC;

  @IsString()
  @IsOptional()
  orderBy?: string = 'id';

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page: number = 1;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  take: number = 10;

  get skip(): number {
    return (this.page - 1) * this.take;
  }
}
