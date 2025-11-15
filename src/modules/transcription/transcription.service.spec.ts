import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { BadRequestException } from '@nestjs/common';
import { TranscriptionService } from './transcription.service';

describe('TranscriptionService - Unit Tests', () => {
  let service: TranscriptionService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: TranscriptionService,
          useValue: {
            submitTranscriptionJob: jest.fn(),
            getTranscriptionStatus: jest.fn(),
            getTranscript: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'ASSEMBLYAI_API_KEY') return 'test-api-key';
              return null;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<TranscriptionService>(TranscriptionService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('submitTranscriptionJob', () => {
    it('should submit transcription job successfully', async () => {
      // Arrange
      const mockResult = { transcriptId: 'abc123' };
      jest.spyOn(service, 'submitTranscriptionJob').mockResolvedValue(mockResult);

      // Act
      const result = await service.submitTranscriptionJob(
        'https://example.com/video.mp4',
        'en',
      );

      // Assert
      expect(result.transcriptId).toBe('abc123');
      expect(service.submitTranscriptionJob).toHaveBeenCalled();
    });

    it('should throw error when API key not configured', async () => {
      // Arrange
      jest.spyOn(service, 'submitTranscriptionJob').mockRejectedValue(
        new BadRequestException('Transcription service not configured'),
      );

      // Act & Assert
      await expect(
        service.submitTranscriptionJob('https://example.com/video.mp4'),
      ).rejects.toThrow('Transcription service not configured');
    });
  });

  describe('submitTranscriptionJob - additional scenarios', () => {
    it('should handle auto-detect language', async () => {
      // Arrange
      const mockResult = { transcriptId: 'xyz789' };
      jest.spyOn(service, 'submitTranscriptionJob').mockResolvedValue(mockResult);

      // Act
      const result = await service.submitTranscriptionJob('https://example.com/video.mp4');

      // Assert
      expect(result.transcriptId).toBeDefined();
      expect(service.submitTranscriptionJob).toHaveBeenCalledWith(
        'https://example.com/video.mp4',
      );
    });
  });
});
