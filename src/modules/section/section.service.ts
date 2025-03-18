import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Section } from 'src/entities/section.entity';

@Injectable()
export class SectionService {
  constructor(
    @InjectRepository(Section)
    private sectionRepository: Repository<Section>,
  ) {}

  async findAll(): Promise<Section[]> {
    return this.sectionRepository.find({
      relations: ['course', 'lessons'],
    });
  }

  async findOne(id: number): Promise<Section> {
    return this.sectionRepository.findOne({
      where: { id },
      relations: ['course', 'lessons'],
    });
  }

  async create(section: Partial<Section>): Promise<Section> {
    const newSection = this.sectionRepository.create(section);
    return this.sectionRepository.save(newSection);
  }

  async update(id: number, section: Partial<Section>): Promise<Section> {
    await this.sectionRepository.update(id, section);
    return this.findOne(id);
  }

  async delete(id: number): Promise<void> {
    await this.sectionRepository.delete(id);
  }

  async findByCourse(courseId: number): Promise<Section[]> {
    return this.sectionRepository.find({
      where: { course: { id: courseId } },
      relations: ['course', 'lessons'],
      order: { order: 'ASC' },
    });
  }
} 