import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type LectureProgressDocument = LectureProgress & Document;

@Schema({ timestamps: true })
export class LectureProgress {
  @Prop({ required: true })
  enrollmentId: number;

  @Prop({ required: true })
  courseId: number;

  @Prop({ required: true })
  lectureId: string;

  @Prop({ required: true, default: false })
  isCompleted: boolean;

  @Prop({ required: false })
  completedAt: Date;

  @Prop({ required: false, default: 0 })
  watchTime: number;
}

export const LectureProgressSchema =
  SchemaFactory.createForClass(LectureProgress);
