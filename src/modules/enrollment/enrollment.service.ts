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
    return this.enrollmentRepository.find({ relations: ['course', 'user'] });
  }

  async findOne(id: number): Promise<Enrollment> {
    const enrollment = await this.enrollmentRepository.findOne({ where: { id }, relations: ['course', 'user'] });
    if (!enrollment) {
      throw new NotFoundException(`Enrollment with ID ${id} not found`);
    }
    return enrollment;
  }

  async create(createEnrollmentDto: CreateEnrollmentDto): Promise<Enrollment> {
    const { courseId, userId, progress } = createEnrollmentDto;

    const course = await this.courseRepository.findOne({ where: { id: courseId } });
    if (!course) {
      throw new NotFoundException(`Course with ID ${courseId} not found`);
    }

    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    const enrollment = this.enrollmentRepository.create({
      course,
      user,
      progress,
    });

    return this.enrollmentRepository.save(enrollment);
  }

  async update(id: number, updateEnrollmentDto: UpdateEnrollmentDto): Promise<Enrollment> {
    const enrollment = await this.findOne(id);

    Object.assign(enrollment, updateEnrollmentDto);

    return this.enrollmentRepository.save(enrollment);
  }

  async remove(id: number): Promise<void> {
    const enrollment = await this.findOne(id);
    await this.enrollmentRepository.remove(enrollment);
  }
}