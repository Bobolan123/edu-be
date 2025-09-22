import { IsString, IsEnum, IsOptional, IsArray, IsNumber } from 'class-validator';
import { CaptionFormat, CaptionStatus } from '../../../schemas/lecture-caption.schema';

export class CreateCaptionDto {
  @IsString()
  lectureId: string;

  @IsNumber()
  courseId: number;

  @IsString()
  videoPublicId: string;

  @IsOptional()
  @IsString()
  language?: string;
}

export class CaptionCueDto {
  @IsNumber()
  start: number;

  @IsNumber()
  end: number;

  @IsString()
  text: string;
}

export class UpdateCaptionDto {
  @IsOptional()
  @IsEnum(CaptionStatus)
  status?: CaptionStatus;

  @IsOptional()
  @IsArray()
  cues?: CaptionCueDto[];

  @IsOptional()
  @IsString()
  processingError?: string;
}

export class GetCaptionDto {
  @IsEnum(CaptionFormat)
  format: CaptionFormat;
}