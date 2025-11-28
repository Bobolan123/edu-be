import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException } from '@nestjs/common';
import { EnrollmentService } from './enrollment.service';
import { Enrollment } from 'src/entities/enrollment.entity';
import { Course } from 'src/entities/course.entity';
import { User } from 'src/entities/user.entity';
import { LectureProgress } from 'src/entities/lecture-progress.entity';

describe('EnrollmentService - Unit Tests', () => {
  let service: EnrollmentService;
  let enrollmentRepository: Repository<Enrollment>;
  let courseRepository: Repository<Course>;
  let userRepository: Repository<User>;
  let lectureProgressRepository: Repository<LectureProgress>;

  const mockCourse: Partial<Course> = {
    id: 1,
    title: 'Test Course',
    description: 'Test Description',
    price: 99.99,
  };

  const mockUser: Partial<User> = {
    id: 1,
    email: 'test@example.com',
    name: 'Test User',
  };

  const mockEnrollment: Partial<Enrollment> = {
    id: 1,
    student: mockUser as User,
    course: mockCourse as Course,
    date_enrolled: new Date('2024-01-01'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EnrollmentService,
        {
          provide: getRepositoryToken(Enrollment),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            remove: jest.fn(),
            createQueryBuilder: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Course),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(User),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(LectureProgress),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            count: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<EnrollmentService>(EnrollmentService);
    enrollmentRepository = module.get<Repository<Enrollment>>(
      getRepositoryToken(Enrollment),
    );
    courseRepository = module.get<Repository<Course>>(
      getRepositoryToken(Course),
    );
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));
    lectureProgressRepository = module.get<Repository<LectureProgress>>(
      getRepositoryToken(LectureProgress),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getCoursesByUser', () => {
    it('should return courses for a user', async () => {
      const enrollments = [
        { ...mockEnrollment, course: mockCourse },
      ] as Enrollment[];
      jest.spyOn(enrollmentRepository, 'find').mockResolvedValue(enrollments);

      const result = await service.getCoursesByUser(1);

      expect(result).toEqual([mockCourse]);
      expect(enrollmentRepository.find).toHaveBeenCalledWith({
        where: { student: { id: 1 } },
        relations: ['course'],
      });
    });

    it('should return empty array if no enrollments found', async () => {
      jest.spyOn(enrollmentRepository, 'find').mockResolvedValue([]);

      const result = await service.getCoursesByUser(1);

      expect(result).toEqual([]);
    });
  });

  describe('findOne', () => {
    it('should return enrollment when found', async () => {
      jest
        .spyOn(enrollmentRepository, 'findOne')
        .mockResolvedValue(mockEnrollment as Enrollment);

      const result = await service.findOne(1);

      expect(result).toEqual(mockEnrollment);
      expect(enrollmentRepository.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
        relations: ['course', 'student'],
      });
    });

    it('should throw NotFoundException when enrollment not found', async () => {
      jest.spyOn(enrollmentRepository, 'findOne').mockResolvedValue(null);

      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
      await expect(service.findOne(999)).rejects.toThrow(
        'Enrollment with ID 999 not found',
      );
    });
  });

  describe('create', () => {
    it('should create enrollment successfully', async () => {
      const createDto = { courseId: 1, userId: 1 };
      jest.spyOn(enrollmentRepository, 'findOne').mockResolvedValue(null);
      jest
        .spyOn(courseRepository, 'findOne')
        .mockResolvedValue(mockCourse as Course);
      jest
        .spyOn(userRepository, 'findOne')
        .mockResolvedValue(mockUser as User);
      jest
        .spyOn(enrollmentRepository, 'create')
        .mockReturnValue(mockEnrollment as Enrollment);
      jest
        .spyOn(enrollmentRepository, 'save')
        .mockResolvedValue(mockEnrollment as Enrollment);

      const result = await service.create(createDto);

      expect(result).toEqual(mockEnrollment);
      expect(enrollmentRepository.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException if course already enrolled', async () => {
      const createDto = { courseId: 1, userId: 1 };
      jest
        .spyOn(enrollmentRepository, 'findOne')
        .mockResolvedValue(mockEnrollment as Enrollment);

      await expect(service.create(createDto)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.create(createDto)).rejects.toThrow(
        'This course 1 is enrolled',
      );
    });

    it('should throw NotFoundException if course not found', async () => {
      const createDto = { courseId: 999, userId: 1 };
      jest
        .spyOn(enrollmentRepository, 'findOne')
        .mockResolvedValueOnce(null);
      jest.spyOn(courseRepository, 'findOne').mockResolvedValue(null);

      await expect(service.create(createDto)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.create(createDto)).rejects.toThrow(
        'Course with ID 999 not found',
      );
    });

    it('should throw NotFoundException if user not found', async () => {
      const createDto = { courseId: 1, userId: 999 };
      jest
        .spyOn(enrollmentRepository, 'findOne')
        .mockResolvedValueOnce(null);
      jest
        .spyOn(courseRepository, 'findOne')
        .mockResolvedValue(mockCourse as Course);
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(null);

      await expect(service.create(createDto)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.create(createDto)).rejects.toThrow(
        'User with ID 999 not found',
      );
    });
  });

  describe('update', () => {
    it('should update enrollment successfully', async () => {
      const updateDto = { date_enrolled: new Date('2024-02-01') };
      const updatedEnrollment = { ...mockEnrollment, ...updateDto };

      jest
        .spyOn(enrollmentRepository, 'findOne')
        .mockResolvedValue(mockEnrollment as Enrollment);
      jest
        .spyOn(enrollmentRepository, 'save')
        .mockResolvedValue(updatedEnrollment as Enrollment);

      const result = await service.update(1, updateDto);

      expect(result).toEqual(updatedEnrollment);
      expect(enrollmentRepository.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException when enrollment not found', async () => {
      jest.spyOn(enrollmentRepository, 'findOne').mockResolvedValue(null);

      await expect(service.update(999, {})).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should remove enrollment successfully', async () => {
      jest
        .spyOn(enrollmentRepository, 'findOne')
        .mockResolvedValue(mockEnrollment as Enrollment);
      jest.spyOn(enrollmentRepository, 'remove').mockResolvedValue(undefined);

      await service.remove(1);

      expect(enrollmentRepository.remove).toHaveBeenCalledWith(mockEnrollment);
    });

    it('should throw NotFoundException when enrollment not found', async () => {
      jest.spyOn(enrollmentRepository, 'findOne').mockResolvedValue(null);

      await expect(service.remove(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('createFromEntities', () => {
    it('should create new enrollment if not exists', async () => {
      jest.spyOn(enrollmentRepository, 'findOne').mockResolvedValue(null);
      jest
        .spyOn(enrollmentRepository, 'create')
        .mockReturnValue(mockEnrollment as Enrollment);
      jest
        .spyOn(enrollmentRepository, 'save')
        .mockResolvedValue(mockEnrollment as Enrollment);

      const result = await service.createFromEntities(
        mockUser as User,
        mockCourse as Course,
      );

      expect(result).toEqual(mockEnrollment);
      expect(enrollmentRepository.create).toHaveBeenCalled();
      expect(enrollmentRepository.save).toHaveBeenCalled();
    });

    it('should return existing enrollment if already exists', async () => {
      jest
        .spyOn(enrollmentRepository, 'findOne')
        .mockResolvedValue(mockEnrollment as Enrollment);

      const result = await service.createFromEntities(
        mockUser as User,
        mockCourse as Course,
      );

      expect(result).toEqual(mockEnrollment);
      expect(enrollmentRepository.create).not.toHaveBeenCalled();
    });
  });

  describe('findByUserAndCourse', () => {
    it('should return enrollment when found', async () => {
      jest
        .spyOn(enrollmentRepository, 'findOne')
        .mockResolvedValue(mockEnrollment as Enrollment);

      const result = await service.findByUserAndCourse(1, 1);

      expect(result).toEqual(mockEnrollment);
      expect(enrollmentRepository.findOne).toHaveBeenCalledWith({
        where: { student: { id: 1 }, course: { id: 1 } },
      });
    });

    it('should return null when enrollment not found', async () => {
      jest.spyOn(enrollmentRepository, 'findOne').mockResolvedValue(null);

      const result = await service.findByUserAndCourse(1, 1);

      expect(result).toBeNull();
    });
  });

  describe('markLectureAsCompleted', () => {
    it('should create new progress if not exists and mark as completed', async () => {
      const mockProgress: Partial<LectureProgress> = {
        enrollmentId: 1,
        courseId: 1,
        lectureId: 'lecture-1',
        isCompleted: null,
      };

      jest.spyOn(lectureProgressRepository, 'findOne').mockResolvedValue(null);
      jest
        .spyOn(lectureProgressRepository, 'create')
        .mockReturnValue(mockProgress as LectureProgress);
      jest
        .spyOn(lectureProgressRepository, 'save')
        .mockResolvedValue({ ...mockProgress, isCompleted: true } as LectureProgress);

      const result = await service.markLectureAsCompleted(1, 1, 'lecture-1');

      expect(result.isCompleted).toBe(true);
      expect(lectureProgressRepository.create).toHaveBeenCalled();
      expect(lectureProgressRepository.save).toHaveBeenCalled();
    });

    it('should toggle from true to null', async () => {
      const mockProgress: Partial<LectureProgress> = {
        enrollmentId: 1,
        courseId: 1,
        lectureId: 'lecture-1',
        isCompleted: true,
      };

      jest
        .spyOn(lectureProgressRepository, 'findOne')
        .mockResolvedValue(mockProgress as LectureProgress);
      jest
        .spyOn(lectureProgressRepository, 'save')
        .mockResolvedValue({ ...mockProgress, isCompleted: null } as LectureProgress);

      const result = await service.markLectureAsCompleted(1, 1, 'lecture-1');

      expect(result.isCompleted).toBeNull();
    });
  });

  describe('updateWatchTime', () => {
    it('should create new progress if not exists', async () => {
      const mockProgress: Partial<LectureProgress> = {
        enrollmentId: 1,
        courseId: 1,
        lectureId: 'lecture-1',
        watchTimeSeconds: 120,
      };

      jest.spyOn(lectureProgressRepository, 'findOne').mockResolvedValue(null);
      jest
        .spyOn(lectureProgressRepository, 'create')
        .mockReturnValue(mockProgress as LectureProgress);
      jest
        .spyOn(lectureProgressRepository, 'save')
        .mockResolvedValue(mockProgress as LectureProgress);

      const result = await service.updateWatchTime(1, 1, 'lecture-1', 120);

      expect(result.watchTimeSeconds).toBe(120);
      expect(lectureProgressRepository.create).toHaveBeenCalled();
    });

    it('should update existing progress watch time', async () => {
      const mockProgress: Partial<LectureProgress> = {
        enrollmentId: 1,
        courseId: 1,
        lectureId: 'lecture-1',
        watchTimeSeconds: 60,
      };

      jest
        .spyOn(lectureProgressRepository, 'findOne')
        .mockResolvedValue(mockProgress as LectureProgress);
      jest
        .spyOn(lectureProgressRepository, 'save')
        .mockResolvedValue({ ...mockProgress, watchTimeSeconds: 180 } as LectureProgress);

      const result = await service.updateWatchTime(1, 1, 'lecture-1', 180);

      expect(result.watchTimeSeconds).toBe(180);
    });
  });

  describe('getLectureProgress', () => {
    it('should return completed lectures', async () => {
      const mockProgressList: Partial<LectureProgress>[] = [
        {
          enrollmentId: 1,
          courseId: 1,
          lectureId: 'lecture-1',
          isCompleted: true,
        },
        {
          enrollmentId: 1,
          courseId: 1,
          lectureId: 'lecture-2',
          isCompleted: true,
        },
      ];

      jest
        .spyOn(lectureProgressRepository, 'find')
        .mockResolvedValue(mockProgressList as LectureProgress[]);

      const result = await service.getLectureProgress(1, 1);

      expect(result).toHaveLength(2);
      expect(lectureProgressRepository.find).toHaveBeenCalledWith({
        where: { enrollmentId: 1, courseId: 1, isCompleted: true },
      });
    });
  });

  describe('calculateProgress', () => {
    it('should return 0 if no lectures in course', async () => {
      const mockCourseWithoutLectures = {
        id: 1,
        sections: [],
      };

      jest
        .spyOn(courseRepository, 'findOne')
        .mockResolvedValue(mockCourseWithoutLectures as Course);

      const result = await service.calculateProgress(1, 1);

      expect(result).toBe(0);
    });

    it('should calculate progress percentage correctly', async () => {
      const mockCourseWithLectures = {
        id: 1,
        sections: [
          { lectures: [{}, {}, {}] },
          { lectures: [{}, {}] },
        ],
      };

      jest
        .spyOn(courseRepository, 'findOne')
        .mockResolvedValue(mockCourseWithLectures as any);
      jest.spyOn(lectureProgressRepository, 'count').mockResolvedValue(3);

      const result = await service.calculateProgress(1, 1);

      expect(result).toBe(60);
    });
  });
});
