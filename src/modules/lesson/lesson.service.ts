import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Lesson } from 'src/entities/lesson.entity';
import { CreateLessonDto } from './dto/create-lesson.dto';
import { UpdateLessonDto } from './dto/update-lesson.dto';
import { Section } from 'src/entities/section.entity';
import { CloudinaryService } from '../cloudinary/cloudinary.service';

@Injectable()
export class LessonService {
  constructor(
    @InjectRepository(Lesson)
    private lessonRepository: Repository<Lesson>,

    @InjectRepository(Section)
    private sectionRepository: Repository<Section>,

    private cloudinaryService: CloudinaryService,
  ) {}

  // ✅ Get all lessons with section details
  async findAll(): Promise<Lesson[]> {
    return this.lessonRepository.find({ 
      relations: ['section'],
      order: { id: 'ASC' }
    });
  }

  // ✅ Get a single lesson by ID with section details
  async findOne(id: number): Promise<Lesson> {
    const lesson = await this.lessonRepository.findOne({ where: { id }, relations: ['section'] });
    if (!lesson) {
      throw new NotFoundException(`Lesson with ID ${id} not found`);
    }
    return lesson;
  }

  async create(createLessonDto: CreateLessonDto): Promise<Lesson> {
    const { sectionId, title, description, videoUrl, order, duration, resources } = createLessonDto;
  
    const section = await this.sectionRepository.findOne({ where: { id: sectionId } });
    if (!section) {
      throw new NotFoundException(`Section with ID ${sectionId} not found`);
    }
  
    const lesson = new Lesson(); 
    lesson.section = section;
    lesson.title = title;
    lesson.description = description;
    lesson.video_url = videoUrl;
    lesson.order = order;
    lesson.duration = duration;
    lesson.resources = resources;
  
    return this.lessonRepository.save(lesson);
  }
  

  // ✅ Update an existing lesson
  async update(id: number, updateLessonDto: UpdateLessonDto): Promise<Lesson> {
    const lesson = await this.findOne(id);

    // Prevent updating sectionId directly (ensure relational integrity)
    if (updateLessonDto.sectionId) {
      const section = await this.sectionRepository.findOne({ where: { id: updateLessonDto.sectionId } });
      if (!section) {
        throw new NotFoundException(`Section with ID ${updateLessonDto.sectionId} not found`);
      }
      lesson.section = section;
    }

    // Update other fields
    Object.assign(lesson, updateLessonDto);

    return this.lessonRepository.save(lesson);
  }

  // ✅ Delete a lesson by ID
  async remove(id: number): Promise<void> {
    const lesson = await this.findOne(id);
    await this.lessonRepository.remove(lesson);
  }

  async uploadVideo(id: number, file: Express.Multer.File): Promise<Lesson> {
    const lesson = await this.findOne(id);
    if (!lesson) {
      throw new NotFoundException(`Lesson with ID ${id} not found`);
    }

    const videoUrl = await this.cloudinaryService.uploadVideo(file, 'lesson-videos');
    lesson.video_url = videoUrl;
    return this.lessonRepository.save(lesson);
  }

  async saveStreamRecording(id: number, streamUrl: string): Promise<Lesson> {
    const lesson = await this.findOne(id);
    if (!lesson) {
      throw new NotFoundException(`Lesson with ID ${id} not found`);
    }

    const recordingUrl = await this.cloudinaryService.uploadStream(streamUrl, 'stream-recordings');
    lesson.stream_recording_url = recordingUrl;
    return this.lessonRepository.save(lesson);
  }
}
