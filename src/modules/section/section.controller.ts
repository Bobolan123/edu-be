import { Controller, Get, Post, Put, Delete, Body, Param, ParseIntPipe } from '@nestjs/common';
import { SectionService } from './section.service';
import { Section } from 'src/entities/section.entity';

@Controller('sections')
export class SectionController {
  constructor(private readonly sectionService: SectionService) {}

  @Get()
  findAll(): Promise<Section[]> {
    return this.sectionService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number): Promise<Section> {
    return this.sectionService.findOne(id);
  }

  @Post()
  create(@Body() section: Partial<Section>): Promise<Section> {
    return this.sectionService.create(section);
  }

  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() section: Partial<Section>,
  ): Promise<Section> {
    return this.sectionService.update(id, section);
  }

  @Delete(':id')
  delete(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.sectionService.delete(id);
  }

  @Get('course/:courseId')
  findByCourse(@Param('courseId', ParseIntPipe) courseId: number): Promise<Section[]> {
    return this.sectionService.findByCourse(courseId);
  }
} 