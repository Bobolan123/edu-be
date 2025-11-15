import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CourseContentService } from './course-content.service';
import { Course } from '../../entities/course.entity';
import { CourseSection } from '../../entities/course-section.entity';
import { CourseLecture } from '../../entities/course-lecture.entity';
import { LectureProgress } from '../../entities/lecture-progress.entity';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { TranscriptionService } from '../transcription/transcription.service';

describe('CourseContentService - Unit Tests', () => {
  let service: CourseContentService;
  let courseRepository: Repository<Course>;
  let sectionRepository: Repository<CourseSection>;
  let lectureRepository: Repository<CourseLecture>;
  let eventEmitter: EventEmitter2;

  const mockCourse = {
    id: 1,
    title: 'React Course',
    sections: [
      {
        id: 'section-1',
        title: 'Introduction',
        orderIndex: 1,
        lectures: [
          { id: 'lecture-1', title: 'Getting Started', orderIndex: 1 },
        ],
      },
    ],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CourseContentService,
        {
          provide: getRepositoryToken(Course),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(CourseSection),
          useValue: {
            delete: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(CourseLecture),
          useValue: {
            findOne: jest.fn(),
            delete: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(LectureProgress),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: DataSource,
          useValue: {},
        },
        {
          provide: CloudinaryService,
          useValue: {
            uploadVideo: jest.fn(),
          },
        },
        {
          provide: TranscriptionService,
          useValue: {
            submitTranscriptionJob: jest.fn(),
          },
        },
        {
          provide: EventEmitter2,
          useValue: {
            emit: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<CourseContentService>(CourseContentService);
    courseRepository = module.get<Repository<Course>>(getRepositoryToken(Course));
    sectionRepository = module.get<Repository<CourseSection>>(
      getRepositoryToken(CourseSection),
    );
    lectureRepository = module.get<Repository<CourseLecture>>(
      getRepositoryToken(CourseLecture),
    );
    eventEmitter = module.get<EventEmitter2>(EventEmitter2);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getCourseStructure', () => {
    it('should return course with sections and lectures', async () => {
      // Arrange
      jest.spyOn(courseRepository, 'findOne').mockResolvedValue(mockCourse as any);

      // Act
      const result = await service.getCourseStructure(1);

      // Assert
      expect(result).toEqual(mockCourse);
      expect(result.sections).toHaveLength(1);
      expect(result.sections[0].lectures).toHaveLength(1);
    });

    it('should throw NotFoundException when course not found', async () => {
      // Arrange
      jest.spyOn(courseRepository, 'findOne').mockResolvedValue(null);

      // Act & Assert
      await expect(service.getCourseStructure(999)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.getCourseStructure(999)).rejects.toThrow(
        'Course with ID 999 not found',
      );
    });
  });

  describe('deleteSection', () => {
    it('should delete section successfully', async () => {
      // Arrange
      jest.spyOn(sectionRepository, 'delete').mockResolvedValue({ affected: 1 } as any);

      // Act & Assert
      await expect(service.deleteSection('section-1')).resolves.not.toThrow();
      expect(sectionRepository.delete).toHaveBeenCalledWith('section-1');
    });

    it('should throw NotFoundException when section not found', async () => {
      // Arrange
      jest.spyOn(sectionRepository, 'delete').mockResolvedValue({ affected: 0 } as any);

      // Act & Assert
      await expect(service.deleteSection('invalid-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('deleteLecture', () => {
    it('should delete lecture and emit event', async () => {
      // Arrange
      jest.spyOn(lectureRepository, 'delete').mockResolvedValue({ affected: 1 } as any);

      // Act
      await service.deleteLecture('lecture-1');

      // Assert
      expect(lectureRepository.delete).toHaveBeenCalledWith('lecture-1');
      expect(eventEmitter.emit).toHaveBeenCalledWith('lecture.deleted', 'lecture-1');
    });

    it('should throw NotFoundException when lecture not found', async () => {
      // Arrange
      jest.spyOn(lectureRepository, 'delete').mockResolvedValue({ affected: 0 } as any);

      // Act & Assert
      await expect(service.deleteLecture('invalid-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getLecture', () => {
    it('should return lecture with relations', async () => {
      // Arrange
      const mockLecture = {
        id: 'lecture-1',
        title: 'Getting Started',
        section: {
          id: 'section-1',
          course: { id: 1 },
        },
      };

      jest.spyOn(lectureRepository, 'findOne').mockResolvedValue(mockLecture as any);

      // Act
      const result = await service.getLecture('lecture-1');

      // Assert
      expect(result).toEqual(mockLecture);
      expect(result.section).toBeDefined();
    });
  });
});
