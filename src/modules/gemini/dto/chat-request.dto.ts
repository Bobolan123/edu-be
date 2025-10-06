import { IsString, IsNotEmpty, IsNumber } from 'class-validator';

export class ChatRequestDto {
  @IsString()
  @IsNotEmpty()
  prompt: string;

  @IsNumber()
  @IsNotEmpty()
  courseId: number;
}
