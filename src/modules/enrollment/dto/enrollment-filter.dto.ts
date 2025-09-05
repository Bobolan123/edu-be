import { Type, Transform } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
  Max,
  IsDateString,
} from 'class-validator';
import { Order } from '../../../common/constants';

export class EnrollmentFilterDto {
  @IsString()
  @IsOptional()
  search?: string;

  @Type(() => Number)
  @IsInt()
  @IsOptional()
  userId?: number;

  @Type(() => Number)
  @IsInt()
  @IsOptional()
  courseId?: number;

  @Type(() => Number)
  @IsInt()
  @IsOptional()
  instructorId?: number;

  @IsString()
  @IsOptional()
  courseName?: string;

  @IsString()
  @IsOptional()
  studentName?: string;

  @IsString()
  @IsOptional()
  studentEmail?: string;

  @IsDateString()
  @IsOptional()
  enrolledFromDate?: string;

  @IsDateString()
  @IsOptional()
  enrolledToDate?: string;

  @IsEnum(Order)
  @IsOptional()
  order?: Order = Order.DESC;

  @IsString()
  @IsOptional()
  orderBy?: string = 'date_enrolled';

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
