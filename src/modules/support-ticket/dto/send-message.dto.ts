import { IsNotEmpty, IsString } from 'class-validator';

export class SendMessageDto {
  @IsNotEmpty()
  @IsString()
  ticketId: string;

  @IsNotEmpty()
  @IsString()
  message: string;
}
