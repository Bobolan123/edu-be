import { IsNotEmpty, IsNumber, IsString, MaxLength } from 'class-validator';

export class CreateTicketDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(255)
  subject: string;

  @IsNotEmpty()
  @IsNumber()
  courseId: number;
}
