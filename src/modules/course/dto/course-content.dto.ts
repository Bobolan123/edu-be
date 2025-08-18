export class CreateLectureDto {
  title: string;
  videoUrl: string;
}

export class CreateSectionDto {
  title: string;
  lectures: CreateLectureDto[];
}

export class UpsertCourseContentDto {
  sections: CreateSectionDto[];
  totalLength: number;
  whatYoullLearn: string[];
}
