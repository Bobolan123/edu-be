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
import { EnrollmentFilterDto } from './dto/enrollment-filter.dto';
import {
  LectureProgress,
  LectureProgressDocument,
} from 'src/schemas/lecture-progress.schema';
import {
  CourseContent,
  CourseContentDocument,
} from 'src/schemas/course-content.schema';
import { CourseProgressSyncService } from '../course/course-progress-sync.service';

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

    private readonly courseProgressSyncService: CourseProgressSyncService,
  ) {}

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
    return this.lectureProgressModel
      .find({ enrollmentId, courseId, isCompleted: true })
      .exec();
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

    // Calculate totalLectures from sections array
    const totalLectures =
      courseContent.sections?.reduce((total, section) => {
        return total + (section.lectures?.length || 0);
      }, 0) || 0;

    if (totalLectures === 0) return 0;

    const completedLectures = await this.lectureProgressModel.countDocuments({
      enrollmentId,
      courseId,
      isCompleted: true,
    });

    const progressPercentage = Math.round(
      (completedLectures / totalLectures) * 100,
    );

    return progressPercentage;
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
      queryBuilder.andWhere('course.title ILIKE :search', {
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

  async findAllWithPaginationAndFilter(
    filterDto: EnrollmentFilterDto,
  ): Promise<ResponsePaginate<Enrollment>> {
    const {
      search,
      userId,
      courseId,
      instructorId,
      courseName,
      studentName,
      studentEmail,
      enrolledFromDate,
      enrolledToDate,
      order,
      orderBy,
    } = filterDto;

    const queryBuilder = this.enrollmentRepository
      .createQueryBuilder('enrollment')
      .leftJoinAndSelect('enrollment.course', 'course')
      .leftJoinAndSelect('enrollment.student', 'student')
      .leftJoinAndSelect('course.instructor', 'instructor');

    if (search) {
      queryBuilder.andWhere(
        '(course.title ILIKE :search OR student.name ILIKE :search OR student.email ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    if (userId) {
      queryBuilder.andWhere('student.id = :userId', { userId });
    }

    if (courseId) {
      queryBuilder.andWhere('course.id = :courseId', { courseId });
    }

    if (instructorId) {
      queryBuilder.andWhere('instructor.id = :instructorId', { instructorId });
    } 

    if (courseName) {
      queryBuilder.andWhere('course.title ILIKE :courseName', {
        courseName: `%${courseName}%`,
      });
    }

    if (studentName) {
      queryBuilder.andWhere('student.name ILIKE :studentName', {
        studentName: `%${studentName}%`,
      });
    }

    if (studentEmail) {
      queryBuilder.andWhere('student.email ILIKE :studentEmail', {
        studentEmail: `%${studentEmail}%`,
      });
    }

    if (enrolledFromDate) {
      queryBuilder.andWhere('enrollment.date_enrolled >= :enrolledFromDate', {
        enrolledFromDate,
      });
    }

    if (enrolledToDate) {
      queryBuilder.andWhere('enrollment.date_enrolled <= :enrolledToDate', {
        enrolledToDate,
      });
    }

    if (orderBy && order) {
      switch (orderBy) {
        case 'course_title':
          queryBuilder.orderBy('course.title', order);
          break;
        case 'student_name':
          queryBuilder.orderBy('student.name', order);
          break;
        case 'instructor_name':
          queryBuilder.orderBy('instructor.name', order);
          break;
        case 'date_enrolled':
          queryBuilder.orderBy('enrollment.date_enrolled', order);
          break;
        case 'id':
          queryBuilder.orderBy('enrollment.id', order);
          break;
        default:
          queryBuilder.orderBy('enrollment.date_enrolled', order);
          break;
      }
    } else {
      queryBuilder.orderBy('enrollment.date_enrolled', 'DESC');
    }

    queryBuilder.skip(filterDto.skip).take(filterDto.take);

    const [enrollments, itemCount] = await queryBuilder.getManyAndCount();

    const enrollmentsWithProgress = await Promise.all(
      enrollments.map(async (enrollment) => {
        const lectureProgress = await this.getLectureProgress(
          enrollment.id,
          enrollment.course.id,
        );
        const progressPercentage = await this.calculateProgress(
          enrollment.id,
          enrollment.course.id,
        );
        const totalWatchTime = await this.getTotalWatchTime(
          enrollment.id,
          enrollment.course.id,
        );
        const completedLecturesCount = lectureProgress.filter(
          (p) => p.isCompleted,
        ).length;

        return {
          ...enrollment,
          progressData: {
            progressPercentage,
            completedLecturesCount,
            totalLecturesCount: await this.getTotalLecturesCount(enrollment.course.id),
            totalWatchTime,
            lastActivity: await this.getLastActivity(enrollment.id, enrollment.course.id),
          },
        };
      }),
    );

    const pageMetaDto = new PageMetaDto({ 
      itemCount, 
      pageOptionsDto: {
        page: filterDto.page,
        take: filterDto.take,
        skip: filterDto.skip,
      } as PageOptionsDto,
    });

    return new ResponsePaginate(enrollmentsWithProgress, pageMetaDto);
  }

  private async getTotalWatchTime(
    enrollmentId: number,
    courseId: number,
  ): Promise<number> {
    const progressRecords = await this.lectureProgressModel
      .find({ enrollmentId, courseId })
      .exec();
    
    return progressRecords.reduce((total, record) => total + (record.watchTime || 0), 0);
  }

  private async getTotalLecturesCount(courseId: number): Promise<number> {
    const courseContent = await this.courseContentModel.findOne({ courseId });
    if (!courseContent) return 0;

    return courseContent.sections?.reduce((total, section) => {
      return total + (section.lectures?.length || 0);
    }, 0) || 0;
  }

  private async getLastActivity(
    enrollmentId: number,
    courseId: number,
  ): Promise<Date | null> {
    const lastProgress = await this.lectureProgressModel
      .findOne({ enrollmentId, courseId })
      .sort({ completedAt: -1 })
      .exec();

    return lastProgress?.completedAt || null;
  }
}
