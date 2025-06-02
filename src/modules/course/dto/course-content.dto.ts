export class CreateLectureDto {
    title: string;
    duration: string;
    videoUrl: string;

  }
  
  export class CreateSectionDto {
    title: string;
    totalLectures: number;
    lectures: CreateLectureDto[];
  }
  
  export class UpsertCourseContentDto {
    sections: CreateSectionDto[];
    totalLength: number;
    totalLectures: number;
    whatYoullLearn: string[];
  }
  