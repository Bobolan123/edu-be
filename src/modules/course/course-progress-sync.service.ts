import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  CourseContent,
  CourseContentDocument,
} from 'src/schemas/course-content.schema';
import {
  LectureProgress,
  LectureProgressDocument,
} from 'src/schemas/lecture-progress.schema';

@Injectable()
export class CourseProgressSyncService {
  private readonly logger = new Logger(CourseProgressSyncService.name);

  constructor(
    @InjectModel(CourseContent.name)
    private readonly courseContentModel: Model<CourseContentDocument>,

    @InjectModel(LectureProgress.name)
    private readonly lectureProgressModel: Model<LectureProgressDocument>,
  ) {}

  private getAllLectureIds(courseContent: CourseContentDocument): string[] {
    if (!courseContent.sections) return [];
    return courseContent.sections.flatMap(
      (section) =>
        section.lectures
          ?.map((lecture) => lecture._id?.toString())
          .filter(Boolean) || [],
    );
  }

  /**
   * Synchronizes lecture progress with current course content
   * Removes orphaned progress records for deleted lectures
   */
  async synchronizeProgressWithContent(courseId: number): Promise<void> {
    this.logger.log(`Starting progress synchronization for course ${courseId}`);

    try {
      const courseContent = await this.courseContentModel.findOne({ courseId });
      if (!courseContent) {
        this.logger.warn(`No course content found for course ${courseId}`);
        return;
      }

      // Get all valid lecture IDs from course content
      const validLectureIds = this.getAllLectureIds(courseContent);
      this.logger.debug(
        `Found ${validLectureIds.length} valid lectures in course ${courseId}`,
      );

      if (validLectureIds.length === 0) {
        // If no lectures exist, remove all progress records for this course
        const deleteResult = await this.lectureProgressModel.deleteMany({
          courseId,
        });
        this.logger.log(
          `Removed ${deleteResult.deletedCount} progress records for course ${courseId} (no lectures)`,
        );
        return;
      }

      // Remove progress records for lectures that no longer exist
      const deleteResult = await this.lectureProgressModel.deleteMany({
        courseId,
        lectureId: { $nin: validLectureIds },
      });

      this.logger.log(
        `Removed ${deleteResult.deletedCount} orphaned progress records for course ${courseId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to synchronize progress for course ${courseId}`,
        error,
      );
      throw error;
    }
  }

  /**
   * Validates and repairs progress data for a specific enrollment
   */
  async validateEnrollmentProgress(
    enrollmentId: number,
    courseId: number,
  ): Promise<{
    isValid: boolean;
    orphanedCount: number;
    totalProgress: number;
    validProgress: number;
  }> {
    this.logger.debug(
      `Validating progress for enrollment ${enrollmentId} in course ${courseId}`,
    );

    const courseContent = await this.courseContentModel.findOne({ courseId });
    if (!courseContent) {
      return {
        isValid: false,
        orphanedCount: 0,
        totalProgress: 0,
        validProgress: 0,
      };
    }

    const validLectureIds = this.getAllLectureIds(courseContent);
    const allProgress = await this.lectureProgressModel.find({
      enrollmentId,
      courseId,
    });

    const orphanedProgress = allProgress.filter(
      (progress) => !validLectureIds.includes(progress.lectureId),
    );

    const validProgress = allProgress.filter((progress) =>
      validLectureIds.includes(progress.lectureId),
    );

    // Clean up orphaned progress records
    if (orphanedProgress.length > 0) {
      await this.lectureProgressModel.deleteMany({
        enrollmentId,
        courseId,
        lectureId: { $nin: validLectureIds },
      });
      this.logger.log(
        `Cleaned up ${orphanedProgress.length} orphaned progress records for enrollment ${enrollmentId}`,
      );
    }

    return {
      isValid: orphanedProgress.length === 0,
      orphanedCount: orphanedProgress.length,
      totalProgress: allProgress.length,
      validProgress: validProgress.length,
    };
  }

  /**
   * Performs bulk synchronization for all courses
   */
  async bulkSynchronizeAllCourses(): Promise<void> {
    this.logger.log('Starting bulk synchronization for all courses');

    const allCourses = await this.courseContentModel.find({}, { courseId: 1 });
    const courseIds = allCourses.map((course) => course.courseId);

    this.logger.log(`Found ${courseIds.length} courses to synchronize`);

    for (const courseId of courseIds) {
      try {
        await this.synchronizeProgressWithContent(courseId);
      } catch (error) {
        this.logger.error(`Failed to synchronize course ${courseId}`, error);
        // Continue with other courses
      }
    }

    this.logger.log('Bulk synchronization completed');
  }

  /**
   * Gets synchronization statistics for a course
   */
  async getCourseProgressStats(courseId: number): Promise<{
    totalLectures: number;
    totalProgressRecords: number;
    uniqueEnrollments: number;
    orphanedRecords: number;
  }> {
    const courseContent = await this.courseContentModel.findOne({ courseId });
    if (!courseContent) {
      return {
        totalLectures: 0,
        totalProgressRecords: 0,
        uniqueEnrollments: 0,
        orphanedRecords: 0,
      };
    }

    const validLectureIds = this.getAllLectureIds(courseContent);
    const totalProgressRecords = await this.lectureProgressModel.countDocuments(
      { courseId },
    );
    const orphanedRecords = await this.lectureProgressModel.countDocuments({
      courseId,
      lectureId: { $nin: validLectureIds },
    });

    const uniqueEnrollments = await this.lectureProgressModel
      .distinct('enrollmentId', { courseId })
      .then((ids) => ids.length);

    // Calculate totalLectures from sections array
    const totalLectures =
      courseContent.sections?.reduce((total, section) => {
        return total + (section.lectures?.length || 0);
      }, 0) || 0;

    return {
      totalLectures,
      totalProgressRecords,
      uniqueEnrollments,
      orphanedRecords,
    };
  }
}
