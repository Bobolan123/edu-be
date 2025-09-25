import { IsString, IsOptional, IsArray } from 'class-validator';

export class UpsertCourseContentDto {
  @IsOptional()
  @IsString()
  language?: string;

  @IsOptional()
  @IsString()
  level?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  whatYoullLearn?: string[];
}
