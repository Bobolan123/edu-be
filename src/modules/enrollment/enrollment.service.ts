import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Course } from 'src/entities/course.entity';
import { Enrollment } from 'src/entities/enrollment.entity';
import { User } from 'src/entities/user.entity';
import { Repository } from 'typeorm';
import { CreateEnrollmentDto } from './dto/create-enrollment.dto';
import { UpdateEnrollmentDto } from './dto/update-enrollment.dto';

@Injectable()
export class EnrollmentService {
  constructor(
    @InjectRepository(Enrollment)
    private enrollmentRepository: Repository<Enrollment>,

    @InjectRepository(Course)
    private courseRepository: Repository<Course>,

    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async findAll(): Promise<Enrollment[]> {
    return this.enrollmentRepository.find({
      relations: ['course', 'user'],
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
      relations: ['course', 'user'],
    });
    if (!enrollment) {
      throw new NotFoundException(`Enrollment with ID ${id} not found`);
    }
    return enrollment;
  }

  async create(createEnrollmentDto: CreateEnrollmentDto): Promise<Enrollment> {
    const { courseId, userId, progress } = createEnrollmentDto;

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
      progress,
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
      progress: 0,
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
}
