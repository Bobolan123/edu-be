import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { QdrantService } from './qdrant.service';
import { GeminiService } from '../gemini/gemini.service';
import { CourseLecture } from '../../entities/course-lecture.entity';
import { CourseSection } from '../../entities/course-section.entity';
import { Course } from '../../entities/course.entity';
import { QuizContent } from '../../interfaces/course-content.interface';

@Injectable()
export class RagSyncService {
  private readonly logger = new Logger(RagSyncService.name);

  constructor(
    private readonly qdrantService: QdrantService,
    private readonly geminiService: GeminiService,
    @InjectRepository(CourseLecture)
    private readonly lectureRepository: Repository<CourseLecture>,
    @InjectRepository(CourseSection)
    private readonly sectionRepository: Repository<CourseSection>,
    @InjectRepository(Course)
    private readonly courseRepository: Repository<Course>,
  ) {}

  /**
   * Extract text content from lecture for embedding
   */
  private extractLectureText(
    lecture: CourseLecture,
    section: CourseSection,
    course: Course,
  ): string {
    let text = `Course: ${course.title}\n`;
    text += `Description: ${course.description}\n`;

    if (course.metadata?.whatYoullLearn) {
      text += `What you'll learn: ${course.metadata.whatYoullLearn.join(', ')}\n`;
    }

    text += `Section: ${section.title}\n`;
    if (section.description) {
      text += `Section Description: ${section.description}\n`;
    }

    text += `Lecture: ${lecture.title}\n`;
    if (lecture.description) {
      text += `Lecture Description: ${lecture.description}\n`;
    }

    if (lecture.contentType === 'quiz') {
      const quizContent = lecture.content as QuizContent;
      quizContent.questions.forEach((q, idx) => {
        text += `\nQuestion ${idx + 1}: ${q.question}`;
        if (q.options) {
          text += `\nOptions: ${q.options.join(', ')}`;
        }
        if (q.explanation) {
          text += `\nExplanation: ${q.explanation}`;
        }
      });
    }

    return text;
  }

  /**
   * Sync a single lecture to Qdrant
   */
  async syncLecture(lectureId: string): Promise<void> {
    try {
      this.logger.log(`Syncing lecture ${lectureId} to Qdrant...`);

      // Load lecture with relations
      const lecture = await this.lectureRepository.findOne({
        where: { id: lectureId },
        relations: ['section', 'section.course'],
      });

      if (!lecture) {
        this.logger.warn(`Lecture ${lectureId} not found, skipping sync`);
        return;
      }

      const section = lecture.section;
      const course = section.course;

      // Extract text
      const text = this.extractLectureText(lecture, section, course);
      this.logger.debug(`Extracted ${text.length} characters from lecture`);

      // Generate embedding
      const embedding = await this.geminiService.generateEmbedding(text);
      this.logger.debug(
        `Generated embedding with ${embedding.length} dimensions`,
      );

      // Upsert to Qdrant
      await this.qdrantService.upsertVector(lecture.id, embedding, {
        lectureId: lecture.id,
        courseId: course.id,
        sectionId: section.id,
        title: lecture.title,
        description: lecture.description || '',
        contentType: lecture.contentType,
        text,
      });

      this.logger.log(`✓ Successfully synced lecture ${lectureId}`);
    } catch (error) {
      this.logger.error(
        `✗ Failed to sync lecture ${lectureId}: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Delete lecture from Qdrant
   */
  async deleteLecture(lectureId: string): Promise<void> {
    try {
      this.logger.log(`Deleting lecture ${lectureId} from Qdrant...`);
      await this.qdrantService.deleteVector(lectureId);
      this.logger.log(`✓ Successfully deleted lecture ${lectureId}`);
    } catch (error) {
      this.logger.error(
        `✗ Failed to delete lecture ${lectureId}: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Sync all lectures in a section
   */
  async syncSection(sectionId: string): Promise<void> {
    try {
      this.logger.log(`Syncing all lectures in section ${sectionId}...`);

      const section = await this.sectionRepository.findOne({
        where: { id: sectionId },
        relations: ['lectures'],
      });

      if (!section || !section.lectures) {
        this.logger.warn(`Section ${sectionId} not found or has no lectures`);
        return;
      }

      for (const lecture of section.lectures) {
        await this.syncLecture(lecture.id);
      }

      this.logger.log(
        `✓ Synced ${section.lectures.length} lectures from section ${sectionId}`,
      );
    } catch (error) {
      this.logger.error(
        `✗ Failed to sync section ${sectionId}: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Sync all lectures in a course
   */
  async syncCourse(courseId: number): Promise<void> {
    try {
      this.logger.log(`Syncing all lectures in course ${courseId}...`);

      const course = await this.courseRepository.findOne({
        where: { id: courseId },
        relations: ['sections', 'sections.lectures'],
      });

      if (!course || !course.sections) {
        this.logger.warn(`Course ${courseId} not found or has no sections`);
        return;
      }

      let totalLectures = 0;
      for (const section of course.sections) {
        if (section.lectures) {
          for (const lecture of section.lectures) {
            await this.syncLecture(lecture.id);
            totalLectures++;
          }
        }
      }

      this.logger.log(
        `✓ Synced ${totalLectures} lectures from course ${courseId}`,
      );
    } catch (error) {
      this.logger.error(
        `✗ Failed to sync course ${courseId}: ${error.message}`,
        error.stack,
      );
    }
  }

  // ==================== Event Listeners ====================

  @OnEvent('lecture.created')
  async handleLectureCreated(lecture: CourseLecture): Promise<void> {
    this.logger.log(`Event received: lecture.created (${lecture.id})`);
    await this.syncLecture(lecture.id);
  }

  @OnEvent('lecture.updated')
  async handleLectureUpdated(lecture: CourseLecture): Promise<void> {
    this.logger.log(`Event received: lecture.updated (${lecture.id})`);
    await this.syncLecture(lecture.id);
  }

  @OnEvent('lecture.deleted')
  async handleLectureDeleted(lectureId: string): Promise<void> {
    this.logger.log(`Event received: lecture.deleted (${lectureId})`);
    await this.deleteLecture(lectureId);
  }

  @OnEvent('section.updated')
  async handleSectionUpdated(section: CourseSection): Promise<void> {
    this.logger.log(`Event received: section.updated (${section.id})`);
    await this.syncSection(section.id);
  }

  @OnEvent('course.updated')
  async handleCourseUpdated(course: Course): Promise<void> {
    this.logger.log(`Event received: course.updated (${course.id})`);
    await this.syncCourse(course.id);
  }
}
