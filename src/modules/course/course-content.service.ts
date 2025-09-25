import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Course } from '../../entities/course.entity';
import { CourseSection } from '../../entities/course-section.entity';
import { CourseLecture } from '../../entities/course-lecture.entity';
import { LectureProgress } from '../../entities/lecture-progress.entity';
import { CreateSectionDto } from './dto/create-section.dto';
import { UpdateSectionDto } from './dto/update-section.dto';
import { CreateLectureDto } from './dto/create-lecture.dto';
import { UpdateLectureDto } from './dto/update-lecture.dto';

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
  ) {}

  // Course Structure Methods
  async getCourseStructure(courseId: number): Promise<Course> {
    const course = await this.courseRepository.findOne({
      where: { id: courseId },
      relations: ['sections', 'sections.lectures'],
      order: {
        sections: {
          orderIndex: 'ASC',
          lectures: { orderIndex: 'ASC' }
        }
      }
    });

    if (!course) {
      throw new NotFoundException(`Course with ID ${courseId} not found`);
    }

    return course;
  }

  // Section Methods
  async createSection(courseId: number, createSectionDto: CreateSectionDto): Promise<CourseSection> {
    const course = await this.courseRepository.findOne({
      where: { id: courseId }
    });

    if (!course) {
      throw new NotFoundException(`Course with ID ${courseId} not found`);
    }

    let orderIndex = createSectionDto.orderIndex;
    if (orderIndex === undefined) {
      const maxOrder = await this.sectionRepository
        .createQueryBuilder('section')
        .select('MAX(section.orderIndex)', 'max')
        .where('section.course = :courseId', { courseId })
        .getRawOne();
      orderIndex = (maxOrder?.max || -1) + 1;
    }

    const section = this.sectionRepository.create({
      ...createSectionDto,
      course,
      orderIndex
    });

    return this.sectionRepository.save(section);
  }

  async updateSection(sectionId: string, updateSectionDto: UpdateSectionDto): Promise<CourseSection> {
    const section = await this.sectionRepository.findOne({
      where: { id: sectionId },
      relations: ['course']
    });

    if (!section) {
      throw new NotFoundException(`Section with ID ${sectionId} not found`);
    }

    Object.assign(section, updateSectionDto);
    return this.sectionRepository.save(section);
  }

  async deleteSection(sectionId: string): Promise<void> {
    const result = await this.sectionRepository.delete(sectionId);
    if (result.affected === 0) {
      throw new NotFoundException(`Section with ID ${sectionId} not found`);
    }
  }

  // Lecture Methods
  async createLecture(sectionId: string, createLectureDto: CreateLectureDto): Promise<CourseLecture> {
    const section = await this.sectionRepository.findOne({
      where: { id: sectionId }
    });

    if (!section) {
      throw new NotFoundException(`Section with ID ${sectionId} not found`);
    }

    let orderIndex = createLectureDto.orderIndex;
    if (orderIndex === undefined) {
      const maxOrder = await this.lectureRepository
        .createQueryBuilder('lecture')
        .select('MAX(lecture.orderIndex)', 'max')
        .where('lecture.section = :sectionId', { sectionId })
        .getRawOne();
      orderIndex = (maxOrder?.max || -1) + 1;
    }

    const lecture = this.lectureRepository.create({
      ...createLectureDto,
      section,
      orderIndex
    });

    return this.lectureRepository.save(lecture);
  }

  async updateLecture(lectureId: string, updateLectureDto: UpdateLectureDto): Promise<CourseLecture> {
    const lecture = await this.lectureRepository.findOne({
      where: { id: lectureId },
      relations: ['section']
    });

    if (!lecture) {
      throw new NotFoundException(`Lecture with ID ${lectureId} not found`);
    }

    Object.assign(lecture, updateLectureDto);
    return this.lectureRepository.save(lecture);
  }

  async deleteLecture(lectureId: string): Promise<void> {
    const result = await this.lectureRepository.delete(lectureId);
    if (result.affected === 0) {
      throw new NotFoundException(`Lecture with ID ${lectureId} not found`);
    }
  }

  async getLecture(lectureId: string): Promise<CourseLecture> {
    const lecture = await this.lectureRepository.findOne({
      where: { id: lectureId },
      relations: ['section', 'section.course']
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
    }
  ): Promise<LectureProgress> {
    const lecture = await this.lectureRepository.findOne({
      where: { id: lectureId },
      relations: ['section']
    });

    if (!lecture) {
      throw new NotFoundException(`Lecture with ID ${lectureId} not found`);
    }

    let progress = await this.progressRepository.findOne({
      where: { enrollmentId, lectureId }
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

  async getCourseProgress(enrollmentId: number, courseId: number): Promise<{
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
        'SUM(lecture.durationSeconds) as totalDuration'
      ])
      .where('section.course = :courseId', { courseId })
      .getRawOne();

    const progress = await this.progressRepository
      .createQueryBuilder('progress')
      .innerJoin('progress.lecture', 'lecture')
      .innerJoin('lecture.section', 'section')
      .select([
        'COUNT(CASE WHEN progress.isCompleted = true THEN 1 END) as completedLectures',
        'SUM(progress.watchTimeSeconds) as watchedDuration'
      ])
      .where('progress.enrollmentId = :enrollmentId', { enrollmentId })
      .andWhere('section.course = :courseId', { courseId })
      .getRawOne();

    const totalLectures = parseInt(totals.totalLectures || '0');
    const completedLectures = parseInt(progress.completedLectures || '0');

    return {
      totalLectures,
      completedLectures,
      progressPercentage: totalLectures > 0 ? Math.round((completedLectures / totalLectures) * 100) : 0,
      totalDuration: parseInt(totals.totalDuration || '0'),
      watchedDuration: parseInt(progress.watchedDuration || '0')
    };
  }

  // Reorder Methods
  async reorderSections(courseId: number, sectionIds: string[]): Promise<void> {
    for (let i = 0; i < sectionIds.length; i++) {
      await this.sectionRepository.update(
        { id: sectionIds[i], course: { id: courseId } },
        { orderIndex: i }
      );
    }
  }

  async reorderLectures(sectionId: string, lectureIds: string[]): Promise<void> {
    for (let i = 0; i < lectureIds.length; i++) {
      await this.lectureRepository.update(
        { id: lectureIds[i], section: { id: sectionId } },
        { orderIndex: i }
      );
    }
  }
}