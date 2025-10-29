import { IsEnum, IsNotEmpty } from 'class-validator';
import { TicketStatus } from '../../../entities/support-ticket.entity';

export class UpdateTicketStatusDto {
  @IsNotEmpty()
  @IsEnum(TicketStatus)
  status: TicketStatus;
}
