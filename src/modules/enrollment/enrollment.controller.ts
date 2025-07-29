import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Put,
  Delete,
  Query,
} from '@nestjs/common';
import { EnrollmentService } from './enrollment.service';
import { Enrollment } from 'src/entities/enrollment.entity';
import { CreateEnrollmentDto } from './dto/create-enrollment.dto';
import { UpdateEnrollmentDto } from './dto/update-enrollment.dto';
import { PageOptionsDto, ResponsePaginate } from 'src/common/dtos';

@Controller('enrollments')
export class EnrollmentController {
  constructor(private readonly enrollmentService: EnrollmentService) {}

  @Get()
  async findAll(): Promise<Enrollment[]> {
    return this.enrollmentService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<Enrollment> {
    return this.enrollmentService.findOne(+id);
  }

  @Post()
  async create(
    @Body() createEnrollmentDto: CreateEnrollmentDto,
  ): Promise<Enrollment> {
    return this.enrollmentService.create(createEnrollmentDto);
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() updateEnrollmentDto: UpdateEnrollmentDto,
  ): Promise<Enrollment> {
    return this.enrollmentService.update(+id, updateEnrollmentDto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string): Promise<void> {
    return this.enrollmentService.remove(+id);
  }

  @Get('user/:userId/course')
  async getCourseByUserWithProgress(
    @Param('userId') userId: string,
    @Query('courseId') courseId?: string,
  ) {
    return this.enrollmentService.getCoursesByUserWithProgress(
      +userId,
      courseId ? +courseId : undefined,
    );
  }

  @Get('user/:userId/courses')
  async getCoursesByUserWithProgressPaginated(
    @Param('userId') userId: string,
    @Query() pageOptionsDto: PageOptionsDto,
  ): Promise<ResponsePaginate<any>> {
    return this.enrollmentService.getCoursesByUserWithProgressPaginated(
      +userId,
      pageOptionsDto,
    );
  }

  @Get('user/:userId/course/:courseId/progress')
  async getEnrollmentWithProgress(
    @Param('userId') userId: string,
    @Param('courseId') courseId: string,
  ) {
    return this.enrollmentService.getEnrollmentWithProgressByUserAndCourse(+userId, +courseId);
  } 

  @Post(':enrollmentId/lectures/:lectureId/complete')
  async markLectureAsCompleted(
    @Param('enrollmentId') enrollmentId: string,
    @Param('lectureId') lectureId: string,
    @Body('courseId') courseId: number,
  ): Promise<void> {
    return this.enrollmentService.markLectureAsCompleted(
      +enrollmentId,
      courseId, 
      lectureId,
    );
  }

  @Put(':enrollmentId/lectures/:lectureId/watch-time')
  async updateWatchTime(
    @Param('enrollmentId') enrollmentId: string,
    @Param('lectureId') lectureId: string,
    @Body() body: { courseId: number; watchTime: number },
  ): Promise<void> {
    return this.enrollmentService.updateWatchTime(
      +enrollmentId,
      body.courseId,
      lectureId,
      body.watchTime,
    );
  }
}
