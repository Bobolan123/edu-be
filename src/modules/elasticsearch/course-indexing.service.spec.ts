import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { CourseIndexingService } from './course-indexing.service';
import { ElasticsearchService } from './elasticsearch.service';
import { Course } from 'src/entities/course.entity';

describe('CourseIndexingService - Unit Tests', () => {
  let service: CourseIndexingService;
  let elasticsearchService: ElasticsearchService;

  const mockCourse: Partial<Course> = {
    id: 1,
    title: 'Test Course',
    description: 'Test Description',
    language: 'English',
    price: 99.99,
    isActive: true,
    average_rating: 4.5,
    total_reviews: 10,
    date_created: new Date('2024-01-01'),
    last_updated: new Date('2024-01-15'),
    instructor: {
      id: 1,
      name: 'Instructor Name',
      email: 'instructor@example.com',
    } as any,
    categories: [
      { id: 1, name: 'Programming' } as any,
      { id: 2, name: 'Web Development' } as any,
    ],
    metadata: {
      language: 'English',
      level: 'intermediate',
      whatYoullLearn: ['Programming basics', 'Web development'],
    },
  };

  const mockCourseWithSections: Partial<Course> = {
    ...mockCourse,
    sections: [
      {
        id: 1,
        lectures: [
          { id: '1', durationSeconds: 300 } as any,
          { id: '2', durationSeconds: 450 } as any,
        ],
      } as any,
      {
        id: 2,
        lectures: [
          { id: '3', durationSeconds: 600 } as any,
        ],
      } as any,
    ],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CourseIndexingService,
        {
          provide: ElasticsearchService,
          useValue: {
            indexCourse: jest.fn(),
            deleteCourse: jest.fn(),
            bulkIndexCourses: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<CourseIndexingService>(CourseIndexingService);
    elasticsearchService = module.get<ElasticsearchService>(
      ElasticsearchService,
    );

    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('transformCourseToDocument', () => {
    it('should transform course to document without sections', () => {
      const result = service.transformCourseToDocument(mockCourse as Course);

      expect(result).toEqual({
        id: 1,
        title: 'Test Course',
        description: 'Test Description',
        language: 'English',
        price: 99.99,
        isActive: true,
        average_rating: 4.5,
        total_reviews: 10,
        date_created: mockCourse.date_created,
        last_updated: mockCourse.last_updated,
        instructor: {
          id: 1,
          name: 'Instructor Name',
          email: 'instructor@example.com',
        },
        categories: [
          { id: 1, name: 'Programming' },
          { id: 2, name: 'Web Development' },
        ],
        metadata: {
          language: 'English',
          level: 'intermediate',
          whatYoullLearn: ['Programming basics', 'Web development'],
        },
      });
    });

    it('should transform course with sections and calculate counts', () => {
      const result = service.transformCourseToDocument(
        mockCourseWithSections as Course,
      );

      expect(result.sections_count).toBe(2);
      expect(result.lectures_count).toBe(3);
      expect(result.total_duration_seconds).toBe(1350);
    });

    it('should handle course without instructor', () => {
      const courseWithoutInstructor = {
        ...mockCourse,
        instructor: null,
      };

      const result = service.transformCourseToDocument(
        courseWithoutInstructor as Course,
      );

      expect(result.instructor).toBeNull();
    });

    it('should handle course without categories', () => {
      const courseWithoutCategories = {
        ...mockCourse,
        categories: null,
      };

      const result = service.transformCourseToDocument(
        courseWithoutCategories as Course,
      );

      expect(result.categories).toEqual([]);
    });

    it('should handle missing ratings', () => {
      const courseWithoutRatings = {
        ...mockCourse,
        average_rating: null,
        total_reviews: null,
      };

      const result = service.transformCourseToDocument(
        courseWithoutRatings as Course,
      );

      expect(result.average_rating).toBe(0);
      expect(result.total_reviews).toBe(0);
    });

    it('should handle missing metadata', () => {
      const courseWithoutMetadata = {
        ...mockCourse,
        metadata: null,
      };

      const result = service.transformCourseToDocument(
        courseWithoutMetadata as Course,
      );

      expect(result.metadata).toEqual({});
    });
  });

  describe('indexCourse', () => {
    it('should index course successfully', async () => {
      jest
        .spyOn(elasticsearchService, 'indexCourse')
        .mockResolvedValue(undefined);

      await service.indexCourse(mockCourse as Course);

      expect(elasticsearchService.indexCourse).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 1,
          title: 'Test Course',
        }),
      );
      expect(Logger.prototype.log).toHaveBeenCalledWith(
        'Indexed course 1: Test Course',
      );
    });

    it('should log error when indexing fails', async () => {
      const error = new Error('Indexing failed');
      jest
        .spyOn(elasticsearchService, 'indexCourse')
        .mockRejectedValue(error);

      await service.indexCourse(mockCourse as Course);

      expect(Logger.prototype.error).toHaveBeenCalledWith(
        'Failed to index course 1',
        error.stack,
      );
    });
  });

  describe('updateCourse', () => {
    it('should update course successfully', async () => {
      jest
        .spyOn(elasticsearchService, 'indexCourse')
        .mockResolvedValue(undefined);

      await service.updateCourse(mockCourse as Course);

      expect(elasticsearchService.indexCourse).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 1,
          title: 'Test Course',
        }),
      );
      expect(Logger.prototype.log).toHaveBeenCalledWith(
        'Updated course 1: Test Course',
      );
    });

    it('should log error when update fails', async () => {
      const error = new Error('Update failed');
      jest
        .spyOn(elasticsearchService, 'indexCourse')
        .mockRejectedValue(error);

      await service.updateCourse(mockCourse as Course);

      expect(Logger.prototype.error).toHaveBeenCalledWith(
        'Failed to update course 1',
        error.stack,
      );
    });
  });

  describe('deleteCourse', () => {
    it('should delete course successfully', async () => {
      jest
        .spyOn(elasticsearchService, 'deleteCourse')
        .mockResolvedValue(undefined);

      await service.deleteCourse(1);

      expect(elasticsearchService.deleteCourse).toHaveBeenCalledWith(1);
      expect(Logger.prototype.log).toHaveBeenCalledWith(
        'Deleted course 1 from index',
      );
    });

    it('should log error when deletion fails', async () => {
      const error = new Error('Deletion failed');
      jest
        .spyOn(elasticsearchService, 'deleteCourse')
        .mockRejectedValue(error);

      await service.deleteCourse(1);

      expect(Logger.prototype.error).toHaveBeenCalledWith(
        'Failed to delete course 1',
        error.stack,
      );
    });
  });

  describe('bulkIndexCourses', () => {
    it('should bulk index courses successfully', async () => {
      const courses = [
        mockCourse as Course,
        { ...mockCourse, id: 2, title: 'Course 2' } as Course,
      ];

      jest
        .spyOn(elasticsearchService, 'bulkIndexCourses')
        .mockResolvedValue(undefined);

      await service.bulkIndexCourses(courses);

      expect(elasticsearchService.bulkIndexCourses).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ id: 1 }),
          expect.objectContaining({ id: 2 }),
        ]),
      );
      expect(Logger.prototype.log).toHaveBeenCalledWith(
        'Bulk indexed 2 courses',
      );
    });

    it('should log error when bulk indexing fails', async () => {
      const error = new Error('Bulk indexing failed');
      jest
        .spyOn(elasticsearchService, 'bulkIndexCourses')
        .mockRejectedValue(error);

      await service.bulkIndexCourses([mockCourse as Course]);

      expect(Logger.prototype.error).toHaveBeenCalledWith(
        'Failed to bulk index courses',
        error.stack,
      );
    });

    it('should handle empty course array', async () => {
      jest
        .spyOn(elasticsearchService, 'bulkIndexCourses')
        .mockResolvedValue(undefined);

      await service.bulkIndexCourses([]);

      expect(elasticsearchService.bulkIndexCourses).toHaveBeenCalledWith([]);
      expect(Logger.prototype.log).toHaveBeenCalledWith('Bulk indexed 0 courses');
    });
  });

  describe('Event Handlers', () => {
    describe('handleCourseCreated', () => {
      it('should handle course.created event', async () => {
        jest.spyOn(service, 'indexCourse').mockResolvedValue(undefined);

        await service.handleCourseCreated(mockCourse as Course);

        expect(Logger.prototype.log).toHaveBeenCalledWith(
          'Event received: course.created for course 1',
        );
        expect(service.indexCourse).toHaveBeenCalledWith(mockCourse);
      });
    });

    describe('handleCourseUpdated', () => {
      it('should handle course.updated event', async () => {
        jest.spyOn(service, 'updateCourse').mockResolvedValue(undefined);

        await service.handleCourseUpdated(mockCourse as Course);

        expect(Logger.prototype.log).toHaveBeenCalledWith(
          'Event received: course.updated for course 1',
        );
        expect(service.updateCourse).toHaveBeenCalledWith(mockCourse);
      });
    });

    describe('handleCourseDeleted', () => {
      it('should handle course.deleted event', async () => {
        jest.spyOn(service, 'deleteCourse').mockResolvedValue(undefined);

        await service.handleCourseDeleted({ courseId: 1 });

        expect(Logger.prototype.log).toHaveBeenCalledWith(
          'Event received: course.deleted for course 1',
        );
        expect(service.deleteCourse).toHaveBeenCalledWith(1);
      });
    });

    describe('handleCourseRestored', () => {
      it('should handle course.restored event', async () => {
        jest.spyOn(service, 'indexCourse').mockResolvedValue(undefined);

        await service.handleCourseRestored(mockCourse as Course);

        expect(Logger.prototype.log).toHaveBeenCalledWith(
          'Event received: course.restored for course 1',
        );
        expect(service.indexCourse).toHaveBeenCalledWith(mockCourse);
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle course with empty sections array', () => {
      const courseWithEmptySections = {
        ...mockCourse,
        sections: [],
      };

      const result = service.transformCourseToDocument(
        courseWithEmptySections as Course,
      );

      expect(result.sections_count).toBe(0);
      expect(result.lectures_count).toBe(0);
      expect(result.total_duration_seconds).toBe(0);
    });

    it('should handle sections with no lectures', () => {
      const courseWithEmptyLectures = {
        ...mockCourse,
        sections: [
          { id: 1, lectures: [] } as any,
          { id: 2, lectures: null } as any,
        ],
      };

      const result = service.transformCourseToDocument(
        courseWithEmptyLectures as Course,
      );

      expect(result.sections_count).toBe(2);
      expect(result.lectures_count).toBe(0);
      expect(result.total_duration_seconds).toBe(0);
    });

    it('should handle lectures with missing duration', () => {
      const courseWithNoDuration = {
        ...mockCourse,
        sections: [
          {
            id: 1,
            lectures: [
              { id: '1', durationSeconds: null } as any,
              { id: '2', durationSeconds: undefined } as any,
            ],
          } as any,
        ],
      };

      const result = service.transformCourseToDocument(
        courseWithNoDuration as Course,
      );

      expect(result.total_duration_seconds).toBe(0);
    });

    it('should handle large number of courses in bulk index', async () => {
      const courses = Array.from({ length: 1000 }, (_, i) => ({
        ...mockCourse,
        id: i + 1,
        title: `Course ${i + 1}`,
      })) as Course[];

      jest
        .spyOn(elasticsearchService, 'bulkIndexCourses')
        .mockResolvedValue(undefined);

      await service.bulkIndexCourses(courses);

      expect(elasticsearchService.bulkIndexCourses).toHaveBeenCalledWith(
        expect.arrayContaining([expect.objectContaining({ id: 1 })]),
      );
      expect(Logger.prototype.log).toHaveBeenCalledWith(
        'Bulk indexed 1000 courses',
      );
    });
  });
});
