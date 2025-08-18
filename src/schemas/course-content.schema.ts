import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type CourseContentDocument = CourseContent & Document;

@Schema()
export class Lecture {
  _id?: string;
  @Prop({ required: true }) title: string;
  @Prop({ required: true }) videoUrl: string;
  @Prop({ required: false }) description: string;
}

export const LectureSchema = SchemaFactory.createForClass(Lecture);

@Schema()
export class Section {
  _id?: string;
  @Prop({ required: true }) title: string;
  @Prop({ type: [LectureSchema], default: [] }) lectures: Lecture[];
}

export const SectionSchema = SchemaFactory.createForClass(Section);

@Schema({ timestamps: true })
export class CourseContent {
  @Prop({ required: true, unique: true })
  courseId: number;
  @Prop({ required: true })
  totalLength: number;
  @Prop({ type: [String], required: true })
  whatYoullLearn: string[];
  @Prop({ type: [SectionSchema], default: [] }) sections: Section[];

  // Helper method to get all lecture IDs for validation
  getAllLectureIds(): string[] {
    if (!this.sections) return [];
    return this.sections.flatMap(
      (section) =>
        section.lectures
          ?.map((lecture) => lecture._id?.toString())
          .filter(Boolean) || [],
    );
  }
}

export const CourseContentSchema = SchemaFactory.createForClass(CourseContent);
