import { Test, TestingModule } from '@nestjs/testing';
import { QdrantService } from './qdrant.service';

describe('QdrantService - Unit Tests', () => {
  let service: QdrantService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: QdrantService,
          useValue: {
            searchByCourse: jest.fn(),
            upsertVector: jest.fn(),
            deleteVector: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<QdrantService>(QdrantService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('searchByCourse', () => {
    it('should search and return relevant lecture chunks', async () => {
      // Arrange
      const courseId = 1;
      const queryEmbedding = new Array(768).fill(0.1);
      const limit = 5;
      const mockResults = [
        {
          id: 'lecture-1-chunk-1',
          score: 0.95,
          payload: {
            lectureId: 'lecture-1',
            courseId: 1,
            text: 'React hooks allow you to use state...',
          },
        },
        {
          id: 'lecture-2-chunk-1',
          score: 0.89,
          payload: {
            lectureId: 'lecture-2',
            courseId: 1,
            text: 'useState is the most common hook...',
          },
        },
      ];

      jest.spyOn(service, 'searchByCourse').mockResolvedValue(mockResults as any);

      // Act
      const result = await service.searchByCourse(courseId, queryEmbedding, limit);

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0].score).toBeGreaterThan(0.8);
      expect(result[0].payload.courseId).toBe(courseId);
    });

    it('should return empty array when no relevant content found', async () => {
      // Arrange
      const courseId = 1;
      const queryEmbedding = new Array(768).fill(0.1);
      const limit = 5;

      jest.spyOn(service, 'searchByCourse').mockResolvedValue([]);

      // Act
      const result = await service.searchByCourse(courseId, queryEmbedding, limit);

      // Assert
      expect(result).toEqual([]);
    });
  });

  describe('upsertVector', () => {
    it('should upsert vector embeddings successfully', async () => {
      // Arrange
      const id = 'lecture-1-chunk-1';
      const vector = new Array(768).fill(0.1);
      const payload = {
        lectureId: 'lecture-1',
        courseId: 1,
        sectionId: 'section-1',
        title: 'Introduction to React',
        description: 'Learn React basics',
        text: 'React Hooks are functions...',
      };

      jest.spyOn(service, 'upsertVector').mockResolvedValue(undefined);

      // Act & Assert
      await expect(
        service.upsertVector(id, vector, payload),
      ).resolves.not.toThrow();
    });
  });

  describe('deleteVector', () => {
    it('should delete vector from database', async () => {
      // Arrange
      const id = 'lecture-1-chunk-1';
      jest.spyOn(service, 'deleteVector').mockResolvedValue(undefined);

      // Act & Assert
      await expect(service.deleteVector(id)).resolves.not.toThrow();
      expect(service.deleteVector).toHaveBeenCalledWith(id);
    });
  });
});
