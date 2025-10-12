import { IsArray, IsOptional, IsString, IsInt, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateLectureDto } from './create-lecture.dto';

export class BatchLectureDto extends CreateLectureDto {
  @IsOptional()
  @IsString()
  id?: string;
}

export class BatchSectionDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  orderIndex?: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BatchLectureDto)
  lectures: BatchLectureDto[];
}

export class BatchSaveContentDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BatchSectionDto)
  sections: BatchSectionDto[];
}
