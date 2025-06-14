import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type CourseContentDocument = CourseContent & Document;

@Schema()
export class Lecture {
  @Prop({ required: true }) title: string;
  @Prop({ required: false })
  totalDuration?: number; #seconds
  @Prop({ required: true }) videoUrl: string;
}

export const LectureSchema = SchemaFactory.createForClass(Lecture);

@Schema()
export class Section {
  @Prop({ required: true }) title: string;
  @Prop({ required: true }) totalLectures: number;
  @Prop({ type: [LectureSchema], default: [] }) lectures: Lecture[];
}

export const SectionSchema = SchemaFactory.createForClass(Section);

@Schema({ timestamps: true })
export class CourseContent {
  @Prop({ required: true, unique: true })
  courseId: number;
  @Prop({ required: true })
  totalLength: number;
  @Prop({ required: true })
  totalLectures: number;
  @Prop({ type: [String], required: true })
  whatYoullLearn: string[];
  @Prop({ type: [SectionSchema], default: [] }) sections: Section[];
}

export const CourseContentSchema = SchemaFactory.createForClass(CourseContent);
