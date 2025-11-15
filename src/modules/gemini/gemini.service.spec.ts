import { Test, TestingModule } from '@nestjs/testing';
import { GeminiService } from './gemini.service';
import { QdrantService } from '../qdrant/qdrant.service';

describe('GeminiService - Unit Tests', () => {
  let service: GeminiService;
  let qdrantService: QdrantService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: GeminiService,
          useValue: {
            generateChat: jest.fn(),
            generateEmbedding: jest.fn(),
            generateChatWithRAG: jest.fn(),
          },
        },
        {
          provide: QdrantService,
          useValue: {
            searchByCourse: jest.fn(),
            upsertLecture: jest.fn(),
            deleteLecture: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<GeminiService>(GeminiService);
    qdrantService = module.get<QdrantService>(QdrantService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('generateChat', () => {
    it('should generate chat response successfully', async () => {
      // Arrange
      const prompt = 'Explain TypeScript generics';
      const mockResponse = 'TypeScript generics allow you to create reusable components...';
      jest.spyOn(service, 'generateChat').mockResolvedValue(mockResponse);

      // Act
      const result = await service.generateChat(prompt);

      // Assert
      expect(result).toBe(mockResponse);
      expect(service.generateChat).toHaveBeenCalledWith(prompt);
    });
  });

  describe('generateEmbedding', () => {
    it('should generate embedding vector successfully', async () => {
      // Arrange
      const text = 'This is a sample text';
      const mockEmbedding = new Array(768).fill(0.1);
      jest.spyOn(service, 'generateEmbedding').mockResolvedValue(mockEmbedding);

      // Act
      const result = await service.generateEmbedding(text);

      // Assert
      expect(result).toEqual(mockEmbedding);
      expect(result).toHaveLength(768);
    });
  });

  describe('generateChatWithRAG', () => {
    it('should generate RAG response with context from course materials', async () => {
      // Arrange
      const prompt = 'What is useState in React?';
      const courseId = 1;
      const mockResponse = {
        answer: 'useState is a React Hook that lets you add state to functional components...',
        sources: [
          { lectureId: 'lec-1', title: 'React Hooks', score: 0.95 },
        ],
      };

      jest.spyOn(service, 'generateChatWithRAG').mockResolvedValue(mockResponse);

      // Act
      const result = await service.generateChatWithRAG(prompt, courseId);

      // Assert
      expect(result.answer).toBeDefined();
      expect(result.sources).toHaveLength(1);
      expect(service.generateChatWithRAG).toHaveBeenCalledWith(prompt, courseId);
    });

    it('should handle Vietnamese language queries', async () => {
      // Arrange
      const prompt = 'useState là gì trong React?';
      const courseId = 1;
      const mockResponse = {
        answer: 'useState là một React Hook cho phép bạn thêm state...',
        sources: [],
      };

      jest.spyOn(service, 'generateChatWithRAG').mockResolvedValue(mockResponse);

      // Act
      const result = await service.generateChatWithRAG(prompt, courseId);

      // Assert
      expect(result.answer).toBeDefined();
      expect(service.generateChatWithRAG).toHaveBeenCalledWith(prompt, courseId);
    });

    it('should return response when no relevant context found', async () => {
      // Arrange
      const prompt = 'Tell me about quantum physics';
      const courseId = 1;
      const mockResponse = {
        answer: 'I don\'t have information about that in this course materials.',
        sources: [],
      };

      jest.spyOn(service, 'generateChatWithRAG').mockResolvedValue(mockResponse);

      // Act
      const result = await service.generateChatWithRAG(prompt, courseId);

      // Assert
      expect(result.answer).toBeDefined();
      expect(result.sources).toEqual([]);
    });
  });
});
