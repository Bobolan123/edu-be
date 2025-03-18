import { Controller, Get, Post, Param, Body, ParseIntPipe } from '@nestjs/common';
import { CertificationService } from './certification.service';
import { Certification } from 'src/entities/certification.entity';

@Controller('certifications')
export class CertificationController {
  constructor(private readonly certificationService: CertificationService) {}

  @Get()
  findAll(): Promise<Certification[]> {
    return this.certificationService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number): Promise<Certification> {
    return this.certificationService.findOne(id);
  }

  @Post()
  create(@Body() certification: Partial<Certification>): Promise<Certification> {
    return this.certificationService.create(certification);
  }

  @Get('user/:userId')
  findByUser(@Param('userId', ParseIntPipe) userId: number): Promise<Certification[]> {
    return this.certificationService.findByUser(userId);
  }

  @Get('course/:courseId')
  findByCourse(@Param('courseId', ParseIntPipe) courseId: number): Promise<Certification[]> {
    return this.certificationService.findByCourse(courseId);
  }

  @Get('verify/:id')
  verify(@Param('id', ParseIntPipe) id: number): Promise<Certification> {
    return this.certificationService.verify(id);
  }
} 