import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Course } from '../../entities/course.entity';
import { CourseSection } from '../../entities/course-section.entity';
import { CourseLecture } from '../../entities/course-lecture.entity';
import { LectureProgress } from '../../entities/lecture-progress.entity';
import { CloudinaryService } from '../cloudinary/cloudinary.service';

@Injectable()
export class CourseContentService {
  constructor(
    @InjectRepository(Course)
    private readonly courseRepository: Repository<Course>,

    @InjectRepository(CourseSection)
    private readonly sectionRepository: Repository<CourseSection>,

    @InjectRepository(CourseLecture)
    private readonly lectureRepository: Repository<CourseLecture>,

    @InjectRepository(LectureProgress)
    private readonly progressRepository: Repository<LectureProgress>,

    private cloudinaryService: CloudinaryService,

    private eventEmitter: EventEmitter2,
  ) {}

  // Course Structure Methods
  async getCourseStructure(courseId: number): Promise<Course> {
    const course = await this.courseRepository.findOne({
      where: { id: courseId },
      relations: ['sections', 'sections.lectures'],
      order: {
        sections: {
          orderIndex: 'ASC',
          lectures: { orderIndex: 'ASC' },
        },
      },
    });

    if (!course) {
      throw new NotFoundException(`Course with ID ${courseId} not found`);
    }

    return course;
  }

  // Delete Methods
  async deleteSection(sectionId: string): Promise<void> {
    const result = await this.sectionRepository.delete(sectionId);
    if (result.affected === 0) {
      throw new NotFoundException(`Section with ID ${sectionId} not found`);
    }
  }

  async deleteLecture(lectureId: string): Promise<void> {
    const result = await this.lectureRepository.delete(lectureId);
    if (result.affected === 0) {
      throw new NotFoundException(`Lecture with ID ${lectureId} not found`);
    }

    // Emit event for RAG sync
    this.eventEmitter.emit('lecture.deleted', lectureId);
  }

  async getLecture(lectureId: string): Promise<CourseLecture> {
    const lecture = await this.lectureRepository.findOne({
      where: { id: lectureId },
      relations: ['section', 'section.course'],
    });

    if (!lecture) {
      throw new NotFoundException(`Lecture with ID ${lectureId} not found`);
    }

    return lecture;
  }

  // Progress Methods
  async updateProgress(
    enrollmentId: number,
    lectureId: string,
    progressData: {
      watchTimeSeconds?: number;
      lastPositionSeconds?: number;
      isCompleted?: boolean;
      submissionData?: any;
    },
  ): Promise<LectureProgress> {
    const lecture = await this.lectureRepository.findOne({
      where: { id: lectureId },
      relations: ['section'],
    });

    if (!lecture) {
      throw new NotFoundException(`Lecture with ID ${lectureId} not found`);
    }

    let progress = await this.progressRepository.findOne({
      where: { enrollmentId, lectureId },
    });

    if (!progress) {
      progress = this.progressRepository.create({
        enrollmentId,
        lectureId,
        courseId: lecture.section.course?.id || 0,
      });
    }

    if (progressData.watchTimeSeconds !== undefined) {
      progress.watchTimeSeconds = progressData.watchTimeSeconds;
    }
    if (progressData.lastPositionSeconds !== undefined) {
      progress.lastPositionSeconds = progressData.lastPositionSeconds;
    }
    if (progressData.isCompleted !== undefined) {
      progress.isCompleted = progressData.isCompleted;
    }
    if (progressData.submissionData !== undefined) {
      progress.submissionData = progressData.submissionData;
    }

    return this.progressRepository.save(progress);
  }

  async getCourseProgress(
    enrollmentId: number,
    courseId: number,
  ): Promise<{
    totalLectures: number;
    completedLectures: number;
    progressPercentage: number;
    totalDuration: number;
    watchedDuration: number;
  }> {
    const totals = await this.lectureRepository
      .createQueryBuilder('lecture')
      .innerJoin('lecture.section', 'section')
      .select([
        'COUNT(lecture.id) as totalLectures',
        'SUM(lecture.durationSeconds) as totalDuration',
      ])
      .where('section.course = :courseId', { courseId })
      .getRawOne();

    const progress = await this.progressRepository
      .createQueryBuilder('progress')
      .innerJoin('progress.lecture', 'lecture')
      .innerJoin('lecture.section', 'section')
      .select([
        'COUNT(CASE WHEN progress.isCompleted = true THEN 1 END) as completedLectures',
        'SUM(progress.watchTimeSeconds) as watchedDuration',
      ])
      .where('progress.enrollmentId = :enrollmentId', { enrollmentId })
      .andWhere('section.course = :courseId', { courseId })
      .getRawOne();

    const totalLectures = parseInt(totals.totalLectures || '0');
    const completedLectures = parseInt(progress.completedLectures || '0');

    return {
      totalLectures,
      completedLectures,
      progressPercentage:
        totalLectures > 0
          ? Math.round((completedLectures / totalLectures) * 100)
          : 0,
      totalDuration: parseInt(totals.totalDuration || '0'),
      watchedDuration: parseInt(progress.watchedDuration || '0'),
    };
  }

  async getCourseContent(courseId: number) {
    const course = await this.courseRepository.findOne({
      where: { id: courseId },
      relations: ['sections', 'sections.lectures'],
      order: {
        sections: {
          orderIndex: 'ASC',
          lectures: { orderIndex: 'ASC' },
        },
      },
    });

    if (!course) {
      throw new BadRequestException('Course not found');
    }

    if (!course.sections || course.sections.length === 0) {
      throw new BadRequestException('No content found for this course');
    }

    return {
      sections: course.sections,
      metadata: course.metadata,
    };
  }

  async uploadLecture(
    courseId: number,
    sectionId: string,
    lectureId: string,
    file: Express.Multer.File,
  ) {
    console.log('uploadLecture service called:', {
      courseId,
      sectionId,
      lectureId,
      fileExists: !!file,
      fileName: file?.originalname,
    });

    const lecture = await this.lectureRepository.findOne({
      where: { id: lectureId },
      relations: ['section'],
    });

    console.log('Lecture found:', {
      lectureExists: !!lecture,
      lectureId: lecture?.id,
      sectionId: lecture?.section?.id,
      expectedSectionId: sectionId,
    });

    if (!lecture) {
      throw new BadRequestException('Lecture not found');
    }

    if (lecture.section.id !== sectionId) {
      throw new BadRequestException(
        'Lecture does not belong to the specified section',
      );
    }

    if (lecture.contentType === 'video' && lecture.content) {
      const videoContent = lecture.content as any;
      if (videoContent.videoUrl) {
        const publicId = this.cloudinaryService.extractPublicId(
          videoContent.videoUrl,
        );
        await this.cloudinaryService.deleteFile(publicId);
      }
    }

    console.log('Starting Cloudinary upload...');
    let url: string, publicId: string, duration: number, qualities: any[];
    try {
      const uploadResult = await this.cloudinaryService.uploadVideo(
        file,
        'course-lectures',
      );
      url = uploadResult.url;
      publicId = uploadResult.publicId;
      duration = uploadResult.duration;
      qualities = uploadResult.qualities;
      console.log('Cloudinary upload successful:', {
        url,
        publicId,
        duration,
        qualitiesCount: qualities?.length,
      });
    } catch (error) {
      console.error('Cloudinary upload failed:', error);
      throw new BadRequestException(`Video upload failed: ${error.message}`);
    }

    lecture.contentType = 'video';
    lecture.content = {
      videoUrl: url,
      cloudinaryPublicId: publicId,
      quality: qualities.length > 0 ? qualities : [{ resolution: 'auto', url }],
    };

    if (duration) {
      lecture.durationSeconds = Math.round(duration);
    }

    const savedLecture = await this.lectureRepository.save(lecture);

    // Emit event for RAG sync (video content changed)
    this.eventEmitter.emit('lecture.updated', savedLecture);

    return url;
  }

  async getCaptions(lectureId: string) {
    const lecture = await this.lectureRepository.findOne({
      where: { id: lectureId },
    });

    if (!lecture) {
      throw new NotFoundException(`Lecture with ID ${lectureId} not found`);
    }

    if (lecture.contentType !== 'video' || !lecture.content) {
      throw new BadRequestException(
        'Captions only available for video lectures',
      );
    }

    const videoContent = lecture.content as any;
    const publicId = videoContent.cloudinaryPublicId;

    if (!publicId) {
      throw new BadRequestException('Video public ID not found');
    }

    return {
      srtUrl: this.cloudinaryService.getCaptionUrl(publicId, 'srt'),
      vttUrl: this.cloudinaryService.getCaptionUrl(publicId, 'vtt'),
      transcriptUrl: this.cloudinaryService.getCaptionUrl(
        publicId,
        'transcript',
      ),
    };
  }

  async batchSaveCourseContent(
    courseId: number,
    sections: Array<{
      id?: string;
      title: string;
      description?: string;
      orderIndex?: number;
      lectures: Array<{
        id?: string;
        title: string;
        description?: string;
        contentType: 'video' | 'quiz';
        orderIndex?: number;
        durationSeconds?: number;
        isPreview?: boolean;
        content: any;
      }>;
    }>,
  ) {
    const course = await this.courseRepository.findOne({
      where: { id: courseId },
    });

    if (!course) {
      throw new NotFoundException(`Course with ID ${courseId} not found`);
    }

    const savedSections = [];

    for (let i = 0; i < sections.length; i++) {
      const sectionData = sections[i];
      let section: CourseSection;

      // Check if this is a new section or update
      const isNewSection =
        !sectionData.id || sectionData.id.startsWith('temp-');

      if (isNewSection) {
        // CREATE new section (temp ID is discarded, database generates real UUID)
        section = this.sectionRepository.create({
          title: sectionData.title,
          description: sectionData.description,
          orderIndex: sectionData.orderIndex ?? i,
          course,
        });
        section = await this.sectionRepository.save(section);
      } else {
        // UPDATE existing section
        section = await this.sectionRepository.findOne({
          where: { id: sectionData.id },
        });

        if (!section) {
          throw new NotFoundException(
            `Section with ID ${sectionData.id} not found`,
          );
        }

        Object.assign(section, {
          title: sectionData.title,
          description: sectionData.description,
          orderIndex: sectionData.orderIndex ?? i,
        });
        section = await this.sectionRepository.save(section);

        // Emit event for RAG sync
        this.eventEmitter.emit('section.updated', section);
      }

      const savedLectures = [];
      for (let j = 0; j < sectionData.lectures.length; j++) {
        const lectureData = sectionData.lectures[j];
        let lecture: CourseLecture;

        // Check if this is a new lecture or update
        const isNewLecture =
          !lectureData.id || lectureData.id.startsWith('temp-');

        if (isNewLecture) {
          // CREATE new lecture (temp ID is discarded, database generates real UUID)
          lecture = this.lectureRepository.create({
            title: lectureData.title,
            description: lectureData.description,
            contentType: lectureData.contentType,
            orderIndex: lectureData.orderIndex ?? j,
            durationSeconds: lectureData.durationSeconds ?? 0,
            isPreview: lectureData.isPreview ?? false,
            content: lectureData.content,
            section: section,
          });
          lecture = await this.lectureRepository.save(lecture);

          this.eventEmitter.emit('lecture.created', lecture);
        } else {
          // UPDATE existing lecture
          lecture = await this.lectureRepository.findOne({
            where: { id: lectureData.id },
          });

          if (!lecture) {
            throw new NotFoundException(
              `Lecture with ID ${lectureData.id} not found`,
            );
          }

          Object.assign(lecture, {
            title: lectureData.title,
            description: lectureData.description,
            contentType: lectureData.contentType,
            orderIndex: lectureData.orderIndex ?? j,
            durationSeconds: lectureData.durationSeconds,
            isPreview: lectureData.isPreview,
            content: lectureData.content,
          });
          lecture = await this.lectureRepository.save(lecture);

          this.eventEmitter.emit('lecture.updated', lecture);
        }

        savedLectures.push(lecture);
      }

      savedSections.push({
        ...section,
        lectures: savedLectures,
      });
    }

    return savedSections;
  }

  async submitQuiz(
    enrollmentId: number,
    lectureId: string,
    answers: Array<{ questionId: string; answer: string | number | boolean }>,
  ): Promise<{
    score: number;
    totalPoints: number;
    percentage: number;
    passed: boolean;
    correctAnswers: number;
    totalQuestions: number;
    results: Array<{
      questionId: string;
      isCorrect: boolean;
      correctAnswer: string | number;
      explanation?: string;
      points: number;
    }>;
  }> {
    const lecture = await this.lectureRepository.findOne({
      where: { id: lectureId },
      relations: ['section', 'section.course'],
    });

    if (!lecture) {
      throw new NotFoundException(`Lecture with ID ${lectureId} not found`);
    }

    if (lecture.contentType !== 'quiz') {
      throw new BadRequestException('This lecture is not a quiz');
    }

    const quizContent = lecture.content as any;
    if (!quizContent || !quizContent.questions) {
      throw new BadRequestException('Quiz content not found');
    }

    let progress = await this.progressRepository.findOne({
      where: { enrollmentId, lectureId },
    });

    if (!progress) {
      progress = this.progressRepository.create({
        enrollmentId,
        lectureId,
        courseId: lecture.section.course?.id || 0,
        submissionData: { attempts: 0 },
      });
    }

    if (!progress.submissionData) {
      progress.submissionData = { attempts: 0 };
    }

    const allowMultipleAttempts = quizContent.allowMultipleAttempts ?? true;
    if (!allowMultipleAttempts && progress.submissionData.attempts > 0) {
      throw new BadRequestException(
        'Multiple attempts not allowed for this quiz',
      );
    }

    const answerMap = new Map(answers.map((a) => [a.questionId, a.answer]));

    let totalScore = 0;
    let totalPoints = 0;
    let correctAnswers = 0;
    const results = [];

    for (const question of quizContent.questions) {
      const studentAnswer = answerMap.get(question.id);
      const correctAnswer = question.correctAnswer;

      // Skip fill_blank questions from scoring
      if (question.type === 'fill_blank') {
        continue;
      }

      let isCorrect = false;
      if (studentAnswer !== undefined && studentAnswer !== null) {
        if (question.type === 'multiple_choice') {
          // Multiple choice: compare as numbers (option index)
          isCorrect = Number(studentAnswer) === Number(correctAnswer);
        } else if (question.type === 'true_false') {
          // True/false: normalize both to boolean
          const studentBool =
            studentAnswer === true || studentAnswer === 'true';
          const correctBool =
            correctAnswer === true || correctAnswer === 'true';
          isCorrect = studentBool === correctBool;
        } else {
          // Fallback: string comparison
          isCorrect =
            String(studentAnswer).trim().toLowerCase() ===
            String(correctAnswer).trim().toLowerCase();
        }
      }

      if (isCorrect) {
        totalScore += question.points;
        correctAnswers++;
      }

      totalPoints += question.points;

      results.push({
        questionId: question.id,
        isCorrect,
        correctAnswer: question.correctAnswer,
        explanation: question.explanation,
        points: question.points,
      });
    }

    const percentage =
      totalPoints > 0 ? Math.round((totalScore / totalPoints) * 100) : 0;
    const passingScore = quizContent.passingScore || 70;
    const passed = percentage >= passingScore;

    progress.submissionData = {
      attempts: (progress.submissionData.attempts || 0) + 1,
      score: totalScore,
      percentage,
      passed,
      lastSubmission: {
        answers: answers,
        submittedAt: new Date(),
        results: results,
      },
      completedAt: passed ? new Date() : progress.submissionData.completedAt,
    };

    progress.isCompleted = passed;
    if (passed) {
      progress.completedAt = new Date();
    }

    await this.progressRepository.save(progress);

    return {
      score: totalScore,
      totalPoints,
      percentage,
      passed,
      correctAnswers,
      totalQuestions: quizContent.questions.length,
      results,
    };
  }
}
