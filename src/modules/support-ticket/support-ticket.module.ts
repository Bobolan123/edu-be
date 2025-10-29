import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MongooseModule } from '@nestjs/mongoose';
import { SupportTicketController } from './support-ticket.controller';
import { SupportTicketService } from './support-ticket.service';
import { SupportTicketGateway } from './support-ticket.gateway';
import { SupportTicket } from '../../entities/support-ticket.entity';
import { Course } from '../../entities/course.entity';
import { User } from '../../entities/user.entity';
import {
  TicketMessage,
  TicketMessageSchema,
} from '../../schemas/ticket-message.schema';

@Module({
  imports: [
    TypeOrmModule.forFeature([SupportTicket, Course, User]),
    MongooseModule.forFeature([
      { name: TicketMessage.name, schema: TicketMessageSchema },
    ]),
  ],
  controllers: [SupportTicketController],
  providers: [SupportTicketService, SupportTicketGateway],
  exports: [SupportTicketService, SupportTicketGateway],
})
export class SupportTicketModule {}
