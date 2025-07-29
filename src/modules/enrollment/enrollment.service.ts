import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Course } from 'src/entities/course.entity';
import { Enrollment } from 'src/entities/enrollment.entity';
import { User } from 'src/entities/user.entity';
import { Repository } from 'typeorm';
import { CreateEnrollmentDto } from './dto/create-enrollment.dto';
import { UpdateEnrollmentDto } from './dto/update-enrollment.dto';
import { PageMetaDto, PageOptionsDto, ResponsePaginate } from 'src/common/dtos';
import {
  LectureProgress,
  LectureProgressDocument,
} from 'src/schemas/lecture-progress.schema';
import {
  CourseContent,
  CourseContentDocument,
} from 'src/schemas/course-content.schema';

@Injectable()
export class EnrollmentService {
  constructor(
    @InjectRepository(Enrollment)
    private enrollmentRepository: Repository<Enrollment>,

    @InjectRepository(Course)
    private courseRepository: Repository<Course>,

    @InjectRepository(User)
    private userRepository: Repository<User>,

    @InjectModel(LectureProgress.name)
    private lectureProgressModel: Model<LectureProgressDocument>,

    @InjectModel(CourseContent.name)
    private courseContentModel: Model<CourseContentDocument>,
  ) {}

  async findAll(): Promise<Enrollment[]> {
    return this.enrollmentRepository.find({
      relations: ['course', 'student'],
      order: { id: 'ASC' },
    });
  }

  async getCoursesByUser(userId: number): Promise<Course[]> {
    const enrollments = await this.enrollmentRepository.find({
      where: { student: { id: userId } },
      relations: ['course'],
    });

    return enrollments.map((enrollment) => enrollment.course);
  }

  async findOne(id: number): Promise<Enrollment> {
    const enrollment = await this.enrollmentRepository.findOne({
      where: { id },
      relations: ['course', 'student'],
    });
    if (!enrollment) {
      throw new NotFoundException(`Enrollment with ID ${id} not found`);
    }
    return enrollment;
  }

  async create(createEnrollmentDto: CreateEnrollmentDto): Promise<Enrollment> {
    const { courseId, userId } = createEnrollmentDto;

    const existing = await this.enrollmentRepository.findOne({
      where: { student: { id: userId }, course: { id: courseId } },
    });
    if (existing) {
      throw new NotFoundException(`This course ${courseId} is enrolled`);
    }

    const course = await this.courseRepository.findOne({
      where: { id: courseId },
    });
    if (!course) {
      throw new NotFoundException(`Course with ID ${courseId} not found`);
    }

    const student = await this.userRepository.findOne({
      where: { id: userId },
    });
    if (!student) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    const enrollment = this.enrollmentRepository.create({
      course,
      student,
    });

    return this.enrollmentRepository.save(enrollment);
  }

  async update(
    id: number,
    updateEnrollmentDto: UpdateEnrollmentDto,
  ): Promise<Enrollment> {
    const enrollment = await this.findOne(id);

    Object.assign(enrollment, updateEnrollmentDto);

    return this.enrollmentRepository.save(enrollment);
  }

  async remove(id: number): Promise<void> {
    const enrollment = await this.findOne(id);
    await this.enrollmentRepository.remove(enrollment);
  }

  async createFromEntities(student: User, course: Course): Promise<Enrollment> {
    const existing = await this.enrollmentRepository.findOne({
      where: { student: { id: student.id }, course: { id: course.id } },
    });
    if (existing) {
      return existing;
    }

    const enrollment = this.enrollmentRepository.create({
      student,
      course,
      date_enrolled: new Date(),
    });
    return this.enrollmentRepository.save(enrollment);
  }

  async findByUserAndCourse(
    userId: number,
    courseId: number,
  ): Promise<Enrollment | null> {
    return this.enrollmentRepository.findOne({
      where: { student: { id: userId }, course: { id: courseId } },
    });
  }

  async markLectureAsCompleted(
    enrollmentId: number,
    courseId: number,
    lectureId: string,
  ): Promise<void> {
    const existingProgress = await this.lectureProgressModel.findOne({
      enrollmentId,
      courseId,
      lectureId,
    });

    const currentCompletionStatus = existingProgress?.isCompleted || false;
    return await this.lectureProgressModel.findOneAndUpdate(
      { enrollmentId, courseId, lectureId },
      {
        isCompleted: !currentCompletionStatus,
        completedAt: new Date(),
      },
      { upsert: true, new: true },
    );
  }

  async updateWatchTime(
    enrollmentId: number,
    courseId: number,
    lectureId: string,
    watchTime: number,
  ): Promise<void> {
    return await this.lectureProgressModel.findOneAndUpdate(
      { enrollmentId, courseId, lectureId },
      { watchTime },
      { upsert: true, new: true },
    );
  }

  async getLectureProgress(
    enrollmentId: number,
    courseId: number,
  ): Promise<LectureProgress[]> {
    return this.lectureProgressModel.find({ enrollmentId, courseId, isCompleted: true }).exec();
  }

  async getEnrollmentWithProgress(enrollmentId: number): Promise<{
    enrollment: Enrollment;
    lectureProgress: LectureProgress[];
    progressPercentage: number; 
  }> {
    const enrollment = await this.findOne(enrollmentId);
    const lectureProgress = await this.getLectureProgress(
      enrollmentId,
      enrollment.course.id,
    );
    const progressPercentage = await this.calculateProgress(
      enrollmentId,
      enrollment.course.id,
    );
    return { enrollment, lectureProgress, progressPercentage };
  }

  async getEnrollmentWithProgressByUserAndCourse(
    userId: number,
    courseId: number,
  ): Promise<{
    enrollment: Enrollment;
    lectureProgress: LectureProgress[];
    progressPercentage: number;
  }> {
    const enrollment = await this.enrollmentRepository.findOne({
      where: { student: { id: userId }, course: { id: courseId } },
      relations: ['course', 'student'],
    });

    if (!enrollment) {
      throw new NotFoundException(
        `Enrollment not found for user ${userId} and course ${courseId}`,
      );
    }

    const lectureProgress = await this.getLectureProgress(
      enrollment.id,
      enrollment.course.id,
    );
    const progressPercentage = await this.calculateProgress(
      enrollment.id,
      enrollment.course.id,
    );
    return { enrollment, lectureProgress, progressPercentage };
  }

  async calculateProgress(
    enrollmentId: number,
    courseId: number,
  ): Promise<number> {
    const courseContent = await this.courseContentModel.findOne({ courseId });
    if (!courseContent) return 0;

    const totalLectures = courseContent.totalLectures;
    const completedLectures = await this.lectureProgressModel.countDocuments({
      enrollmentId,
      courseId,
      isCompleted: true,
    });

    return totalLectures > 0
      ? Math.round((completedLectures / totalLectures) * 100)
      : 0;
  }

  async getCoursesByUserWithProgress(userId: number, courseId?: number) {
    if (courseId) {
      const enrollment = await this.enrollmentRepository.findOne({
        where: { student: { id: userId }, course: { id: courseId } },
        relations: ['course'],
      });

      if (!enrollment) {
        throw new NotFoundException(
          `Enrollment not found for user ${userId} and course ${courseId}`,
        );
      }

      const lectureProgress = await this.getLectureProgress(
        enrollment.id,
        enrollment.course.id,
      );
      const progress = await this.calculateProgress(
        enrollment.id,
        enrollment.course.id,
      );

      return {
        ...enrollment.course,
        enrollmentId: enrollment.id,
        progress,
        dateEnrolled: enrollment.date_enrolled,
        lectureProgress: lectureProgress.length,
      };
    }

    const enrollments = await this.enrollmentRepository.find({
      where: { student: { id: userId } },
      relations: ['course'],
    });

    const coursesWithProgress = await Promise.all(
      enrollments.map(async (enrollment) => {
        const lectureProgress = await this.getLectureProgress(
          enrollment.id,
          enrollment.course.id,
        );
        const progress = await this.calculateProgress(
          enrollment.id,
          enrollment.course.id,
        );

        return {
          ...enrollment.course,
          enrollmentId: enrollment.id,
          progress,
          dateEnrolled: enrollment.date_enrolled,
          lectureProgress: lectureProgress.length,
          completedLectures: lectureProgress.filter((p) => p.isCompleted)
            .length,
        };
      }),
    );

    return coursesWithProgress;
  }

  async getCoursesByUserWithProgressPaginated(
    userId: number,
    pageOptionsDto: PageOptionsDto,
  ): Promise<ResponsePaginate<any>> {
    const { search, order, orderBy } = pageOptionsDto;

    const queryBuilder = this.enrollmentRepository
      .createQueryBuilder('enrollment')
      .leftJoinAndSelect('enrollment.course', 'course')
      .leftJoinAndSelect('course.categories', 'categories')
      .leftJoinAndSelect('course.instructor', 'instructor')
      .where('enrollment.student = :userId', { userId });

    if (search) {
      queryBuilder.andWhere('course.title LIKE :search', {
        search: `%${search}%`,
      });
    }

    queryBuilder.skip(pageOptionsDto.skip).take(pageOptionsDto.take);

    const [enrollments, itemCount] = await queryBuilder.getManyAndCount();

    const coursesWithProgress = await Promise.all(
      enrollments.map(async (enrollment) => {
        const lectureProgress = await this.getLectureProgress(
          enrollment.id,
          enrollment.course.id,
        );
        const progress = await this.calculateProgress(
          enrollment.id,
          enrollment.course.id,
        );

        return {
          ...enrollment.course,
          enrollmentId: enrollment.id,
          progress,
          dateEnrolled: enrollment.date_enrolled,
          lectureProgress: lectureProgress.length,
        };
      }),
    );

    const pageMetaDto = new PageMetaDto({ itemCount, pageOptionsDto });

    return new ResponsePaginate(coursesWithProgress, pageMetaDto);
  }
}
