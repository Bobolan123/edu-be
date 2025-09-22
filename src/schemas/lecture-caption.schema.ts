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
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed'
}

export enum CaptionFormat {
  SRT = 'srt',
  VTT = 'vtt',
  TRANSCRIPT = 'transcript'
}

@Schema({ timestamps: true })
export class LectureCaption {
  @Prop({ required: true })
  lectureId: string;

  @Prop({ required: true })
  courseId: number;

  @Prop({ required: true })
  videoPublicId: string; // Cloudinary public ID

  @Prop({
    type: String,
    enum: Object.values(CaptionStatus),
    default: CaptionStatus.PENDING
  })
  status: CaptionStatus;

  @Prop({ type: [Object], default: [] })
  cues: CaptionCue[];

  @Prop({ type: Map, of: String })
  cloudinaryFiles: Map<string, string>; // format -> cloudinary_url

  @Prop({ required: false })
  language: string;

  @Prop({ required: false })
  processingError: string;

  @Prop({ required: false })
  transcriptionJobId: string;
}

export const LectureCaptionSchema = SchemaFactory.createForClass(LectureCaption);