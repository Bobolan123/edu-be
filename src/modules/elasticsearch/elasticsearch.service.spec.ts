import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { ElasticsearchService } from './elasticsearch.service';

describe('ElasticsearchService - Unit Tests', () => {
  let service: ElasticsearchService;
  let mockClient: any;

  beforeEach(async () => {
    mockClient = {
      search: jest.fn(),
      index: jest.fn(),
      delete: jest.fn(),
      cluster: {
        health: jest.fn(),
      },
      indices: {
        exists: jest.fn(),
        create: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: ElasticsearchService,
          useValue: {
            searchCourses: jest.fn(),
            indexCourse: jest.fn(),
            deleteCourse: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'ELASTICSEARCH_NODE') return 'http://localhost:9200';
              if (key === 'ELASTICSEARCH_INDEX_COURSES') return 'courses';
              return null;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<ElasticsearchService>(ElasticsearchService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('searchCourses', () => {
    it('should search courses successfully', async () => {
      // Arrange
      const mockSearchResult = {
        total: 2,
        page: 1,
        pageSize: 10,
        documents: [
          { id: 1, title: 'TypeScript Course', score: 5.2 },
          { id: 2, title: 'JavaScript Course', score: 4.8 },
        ],
      };

      jest.spyOn(service, 'searchCourses').mockResolvedValue(mockSearchResult as any);

      // Act
      const result = await service.searchCourses({ query: 'TypeScript' });

      // Assert
      expect(result.total).toBe(2);
      expect(result.documents).toHaveLength(2);
      expect(result.documents[0].title).toContain('TypeScript');
    });

    it('should return empty results when no courses found', async () => {
      // Arrange
      jest.spyOn(service, 'searchCourses').mockResolvedValue({
        total: 0,
        page: 1,
        pageSize: 10,
        documents: [],
      } as any);

      // Act
      const result = await service.searchCourses({ query: 'NonExistentCourse' });

      // Assert
      expect(result.total).toBe(0);
      expect(result.documents).toEqual([]);
    });
  });

  describe('indexCourse', () => {
    it('should index a course successfully', async () => {
      // Arrange
      const courseData = {
        id: 1,
        title: 'New Course',
        description: 'Course description',
      };

      jest.spyOn(service, 'indexCourse').mockResolvedValue(undefined);

      // Act & Assert
      await expect(service.indexCourse(courseData as any)).resolves.not.toThrow();
      expect(service.indexCourse).toHaveBeenCalledWith(courseData);
    });
  });

  describe('deleteCourse', () => {
    it('should delete a course from index successfully', async () => {
      // Arrange
      jest.spyOn(service, 'deleteCourse').mockResolvedValue(undefined);

      // Act & Assert
      await expect(service.deleteCourse(1)).resolves.not.toThrow();
      expect(service.deleteCourse).toHaveBeenCalledWith(1);
    });
  });
});
