import { Controller, Get, Post, Param, Body, Put, Delete } from '@nestjs/common';
import { EnrollmentService } from './enrollment.service';
import { Enrollment } from 'src/entities/enrollment.entity';
import { CreateEnrollmentDto } from './dto/create-enrollment.dto';
import { UpdateEnrollmentDto } from './dto/update-enrollment.dto';

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
  async create(@Body() createEnrollmentDto: CreateEnrollmentDto): Promise<Enrollment> {
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
}