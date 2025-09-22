import { IsString, IsOptional, IsArray, IsNumber } from 'class-validator';

export class CreateLectureDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  videoUrl?: string;
}

export class CreateSectionDto {
  @IsString()
  title: string;

  @IsArray()
  lectures: CreateLectureDto[];
}

export class UpsertCourseContentDto {
  @IsArray()
  sections: CreateSectionDto[];

  @IsNumber()
  totalLength: number;

  @IsArray()
  @IsString({ each: true })
  whatYoullLearn: string[];
}
