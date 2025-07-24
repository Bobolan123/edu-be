import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

import { Order } from '../constants';

export abstract class PageOptionsDto {
  @IsString()
  search?: string = '';

  @IsEnum(Order)
  @IsOptional()
  order?: Order = Order.DESC;
  orderBy?: string = 'id';
  minRating?: number;
  instructorId?: number;
  userId?: number;

  @Transform(({ value }) =>
    value ? (Array.isArray(value) ? value.map(Number) : [Number(value)]) : [],
  )
  @IsArray()
  @IsOptional()
  categoryIds?: number[];

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
