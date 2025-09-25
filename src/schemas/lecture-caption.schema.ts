import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type LectureCaptionDocument = LectureCaption & Document;

export interface CaptionCue {
  start: number; // Start time in seconds
  end: number;   // End time in seconds
  text: string;  // Caption text
}

export enum CaptionStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

export enum CaptionFormat {
  SRT = 'srt',
}

export enum CaptionSource {
  AUTO_GENERATED = 'auto_generated',
  INSTRUCTOR_UPLOADED = 'instructor_uploaded',
}

@Schema({ timestamps: true })
export class LectureCaption {
  @Prop({ required: true })
  lectureId: string;

  @Prop({ required: true })
  courseId: number;

  @Prop({ required: true })
  videoPublicId: string; // Cloudinary public ID

  @Prop({ required: true, default: 'en' })
  language: string; // ISO language code (en, es, fr, etc.)

  @Prop({
    type: String,
    enum: Object.values(CaptionStatus),
    default: CaptionStatus.PENDING
  })
  status: CaptionStatus;

  @Prop({
    type: String,
    enum: Object.values(CaptionSource),
    default: CaptionSource.AUTO_GENERATED
  })
  source: CaptionSource;

  @Prop({ type: [Object], default: [] })
  cues: CaptionCue[];

  @Prop({ type: Map, of: String })
  files: Map<string, string>; // format -> cloudinary_url

  @Prop({ required: false })
  processingError: string;

  @Prop({ required: false })
  transcriptionJobId: string;

  @Prop({ required: false })
  accuracy: number; // 0-100% confidence score

  @Prop({ required: false })
  reviewedBy: string; // User ID who reviewed

  @Prop({ required: false })
  reviewedAt: Date;
}

export const LectureCaptionSchema = SchemaFactory.createForClass(LectureCaption);