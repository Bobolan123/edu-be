import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type TicketMessageDocument = TicketMessage & Document;

@Schema({ timestamps: true })
export class TicketMessage {
  @Prop({ required: true })
  ticketId: string;

  @Prop({ required: true })
  senderId: number;

  @Prop({ required: true, enum: ['student', 'teacher'] })
  senderRole: string;

  @Prop({ required: true })
  message: string;

  @Prop({ default: false })
  isRead: boolean;
}

export const TicketMessageSchema = SchemaFactory.createForClass(TicketMessage);
