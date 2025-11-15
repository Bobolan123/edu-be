import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CourseService } from './course.service';
import { Course } from '../../entities/course.entity';
import { User } from '../../entities/user.entity';
import { Category } from '../../entities/category.entity';
import { Enrollment } from '../../entities/enrollment.entity';
import { LectureProgress } from '../../entities/lecture-progress.entity';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { ReviewService } from '../review/review.service';
import { ElasticsearchService } from '../elasticsearch/elasticsearch.service';

describe('CourseService - Unit Tests', () => {
  let service: CourseService;
  let courseRepository: Repository<Course>;
  let userRepository: Repository<User>;
  let categoryRepository: Repository<Category>;
  let enrollmentRepository: Repository<Enrollment>;
  let eventEmitter: EventEmitter2;
  let reviewService: ReviewService;

  const mockInstructor = {
    id: 1,
    email: 'instructor@example.com',
    name: 'John Instructor',
  };

  const mockCategory = {
    id: 1,
    name: 'Web Development',
  };

  const mockCourse = {
    id: 1,
    title: 'Introduction to TypeScript',
    description: 'Learn TypeScript basics',
    price: 49.99,
    instructor: mockInstructor,
    categories: [mockCategory],
    isActive: true,
    deleted_at: null,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CourseService,
        {
          provide: getRepositoryToken(Course),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            softDelete: jest.fn(),
            restore: jest.fn(),
            delete: jest.fn(),
            createQueryBuilder: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(User),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Category),
          useValue: {
            findByIds: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Enrollment),
          useValue: {
            find: jest.fn(),
            createQueryBuilder: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(LectureProgress),
          useValue: {
            count: jest.fn(),
            delete: jest.fn(),
          },
        },
        {
          provide: CloudinaryService,
          useValue: {
            uploadImage: jest.fn(),
            deleteFile: jest.fn(),
            extractPublicId: jest.fn(),
          },
        },
        {
          provide: ReviewService,
          useValue: {
            getAverageRating: jest.fn(),
          },
        },
        {
          provide: EventEmitter2,
          useValue: {
            emit: jest.fn(),
          },
        },
        {
          provide: ElasticsearchService,
          useValue: {
            searchCourses: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<CourseService>(CourseService);
    courseRepository = module.get<Repository<Course>>(getRepositoryToken(Course));
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));
    categoryRepository = module.get<Repository<Category>>(getRepositoryToken(Category));
    enrollmentRepository = module.get<Repository<Enrollment>>(getRepositoryToken(Enrollment));
    eventEmitter = module.get<EventEmitter2>(EventEmitter2);
    reviewService = module.get<ReviewService>(ReviewService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a new course successfully', async () => {
      // Arrange
      const createCourseDto = {
        title: 'New Course',
        description: 'Course description',
        price: 29.99,
        instructorId: 1,
        categoryIds: [1],
      };

      jest.spyOn(courseRepository, 'findOne').mockResolvedValue(null);
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockInstructor as any);
      jest.spyOn(categoryRepository, 'findByIds').mockResolvedValue([mockCategory] as any);
      jest.spyOn(courseRepository, 'create').mockReturnValue(mockCourse as any);
      jest.spyOn(courseRepository, 'save').mockResolvedValue(mockCourse as any);

      // Act
      const result = await service.create(createCourseDto as any);

      // Assert
      expect(result).toEqual(mockCourse);
      expect(courseRepository.save).toHaveBeenCalled();
      expect(eventEmitter.emit).toHaveBeenCalledWith('course.created', mockCourse);
    });

    it('should throw error when course title already exists', async () => {
      // Arrange
      const createCourseDto = {
        title: 'Existing Course',
        instructorId: 1,
        categoryIds: [1],
      };

      jest.spyOn(courseRepository, 'findOne').mockResolvedValue(mockCourse as any);

      // Act & Assert
      await expect(service.create(createCourseDto as any)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.create(createCourseDto as any)).rejects.toThrow(
        'The course "Existing Course" already exists.',
      );
    });

    it('should throw error when instructor not found', async () => {
      // Arrange
      const createCourseDto = {
        title: 'New Course',
        instructorId: 999,
        categoryIds: [1],
      };

      jest.spyOn(courseRepository, 'findOne').mockResolvedValue(null);
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(null);

      // Act & Assert
      await expect(service.create(createCourseDto as any)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.create(createCourseDto as any)).rejects.toThrow(
        'Instructor with ID 999 not found.',
      );
    });

    it('should throw error when category IDs are invalid', async () => {
      // Arrange
      const createCourseDto = {
        title: 'New Course',
        instructorId: 1,
        categoryIds: [1, 2],
      };

      jest.spyOn(courseRepository, 'findOne').mockResolvedValue(null);
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockInstructor as any);
      jest.spyOn(categoryRepository, 'findByIds').mockResolvedValue([mockCategory] as any);

      // Act & Assert
      await expect(service.create(createCourseDto as any)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.create(createCourseDto as any)).rejects.toThrow(
        'One or more category IDs are invalid.',
      );
    });
  });

  describe('update', () => {
    it('should update a course successfully', async () => {
      // Arrange
      const updateCourseDto = {
        title: 'Updated Course Title',
        price: 59.99,
      };

      jest.spyOn(courseRepository, 'findOne').mockResolvedValueOnce(mockCourse as any);
      jest.spyOn(courseRepository, 'findOne').mockResolvedValueOnce(null);
      jest.spyOn(courseRepository, 'save').mockResolvedValue({
        ...mockCourse,
        ...updateCourseDto,
      } as any);

      // Act
      const result = await service.update(1, updateCourseDto);

      // Assert
      expect(result.title).toBe('Updated Course Title');
      expect(result.price).toBe(59.99);
      expect(eventEmitter.emit).toHaveBeenCalledWith('course.updated', expect.any(Object));
    });

    it('should throw error when course not found', async () => {
      // Arrange
      jest.spyOn(courseRepository, 'findOne').mockResolvedValue(null);

      // Act & Assert
      await expect(service.update(999, {})).rejects.toThrow(BadRequestException);
      await expect(service.update(999, {})).rejects.toThrow(
        'Course with ID 999 not found.',
      );
    });

    it('should throw error when updating to existing title', async () => {
      // Arrange
      const updateCourseDto = { title: 'Existing Title' };
      const existingCourse = { ...mockCourse, id: 2, title: 'Existing Title' };

      jest.spyOn(courseRepository, 'findOne')
        .mockResolvedValueOnce(mockCourse as any)
        .mockResolvedValueOnce(existingCourse as any);

      // Act & Assert
      await expect(service.update(1, updateCourseDto)).rejects.toThrow(
        'The course "Existing Title" already exists.',
      );
    });
  });

  describe('remove', () => {
    it('should soft delete a course successfully', async () => {
      // Arrange
      jest.spyOn(courseRepository, 'findOne').mockResolvedValue(mockCourse as any);
      jest.spyOn(courseRepository, 'softDelete').mockResolvedValue({ affected: 1 } as any);

      // Act
      const result = await service.remove(1);

      // Assert
      expect(result).toEqual({ affected: 1 });
      expect(courseRepository.softDelete).toHaveBeenCalledWith(1);
      expect(eventEmitter.emit).toHaveBeenCalledWith('course.deleted', { courseId: 1 });
    });

    it('should throw error when course not found', async () => {
      // Arrange
      jest.spyOn(courseRepository, 'findOne').mockResolvedValue(null);

      // Act & Assert
      await expect(service.remove(999)).rejects.toThrow(BadRequestException);
      await expect(service.remove(999)).rejects.toThrow(
        'Course with ID 999 not found.',
      );
    });
  });

  describe('restore', () => {
    it('should restore a deleted course successfully', async () => {
      // Arrange
      const deletedCourse = { ...mockCourse, deleted_at: new Date() };
      jest.spyOn(courseRepository, 'findOne').mockResolvedValueOnce(deletedCourse as any);
      jest.spyOn(courseRepository, 'restore').mockResolvedValue({ affected: 1 } as any);
      jest.spyOn(courseRepository, 'findOne').mockResolvedValueOnce(mockCourse as any);

      // Act
      await service.restore(1);

      // Assert
      expect(courseRepository.restore).toHaveBeenCalledWith(1);
      expect(eventEmitter.emit).toHaveBeenCalledWith('course.restored', mockCourse);
    });

    it('should throw error when course not found', async () => {
      // Arrange
      jest.spyOn(courseRepository, 'findOne').mockResolvedValue(null);

      // Act & Assert
      await expect(service.restore(999)).rejects.toThrow(BadRequestException);
      await expect(service.restore(999)).rejects.toThrow(
        'Course with ID 999 not found or not deleted.',
      );
    });
  });

  describe('findOne', () => {
    it('should return a course by id', async () => {
      // Arrange
      const mockQueryBuilder = {
        withDeleted: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(mockCourse),
      };

      jest.spyOn(courseRepository, 'createQueryBuilder').mockReturnValue(mockQueryBuilder as any);
      jest.spyOn(reviewService, 'getAverageRating').mockResolvedValue(4.5);

      // Act
      const result = await service.findOne(1);

      // Assert
      expect(result).toHaveProperty('average_rating', 4.5);
      expect(result.title).toBe(mockCourse.title);
    });

    it('should throw error when course not found', async () => {
      // Arrange
      const mockQueryBuilder = {
        withDeleted: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(null),
      };

      jest.spyOn(courseRepository, 'createQueryBuilder').mockReturnValue(mockQueryBuilder as any);

      // Act & Assert
      await expect(service.findOne(999)).rejects.toThrow(BadRequestException);
      await expect(service.findOne(999)).rejects.toThrow(
        'Course with ID 999 not found.',
      );
    });
  });
});
