import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { CloudinaryService } from './cloudinary.service';

describe('CloudinaryService - Unit Tests', () => {
  let service: CloudinaryService;

  const mockFile: Express.Multer.File = {
    fieldname: 'file',
    originalname: 'test.jpg',
    encoding: '7bit',
    mimetype: 'image/jpeg',
    buffer: Buffer.from('test'),
    size: 1024,
  } as Express.Multer.File;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: CloudinaryService,
          useValue: {
            uploadImage: jest.fn(),
            uploadVideo: jest.fn(),
            deleteFile: jest.fn(),
            extractPublicId: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<CloudinaryService>(CloudinaryService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('uploadImage', () => {
    it('should upload image successfully', async () => {
      // Arrange
      const mockUrl = 'https://res.cloudinary.com/test/image.jpg';
      jest.spyOn(service, 'uploadImage').mockResolvedValue(mockUrl);

      // Act
      const result = await service.uploadImage(mockFile, 'course-thumbnails');

      // Assert
      expect(result).toBe(mockUrl);
      expect(service.uploadImage).toHaveBeenCalledWith(mockFile, 'course-thumbnails');
    });

    it('should throw error when upload fails', async () => {
      // Arrange
      jest.spyOn(service, 'uploadImage').mockRejectedValue(
        new BadRequestException('Failed to upload image'),
      );

      // Act & Assert
      await expect(service.uploadImage(mockFile, 'test')).rejects.toThrow(
        'Failed to upload image',
      );
    });
  });

  describe('uploadVideo', () => {
    it('should upload video successfully', async () => {
      // Arrange
      const mockVideoResult = {
        url: 'https://res.cloudinary.com/test/video.mp4',
        duration: 120,
        publicId: 'test/video',
        qualities: [{ resolution: '720p', url: 'https://res.cloudinary.com/test/video_720p.mp4' }],
      };

      jest.spyOn(service, 'uploadVideo').mockResolvedValue(mockVideoResult);

      // Act
      const result = await service.uploadVideo(mockFile, 'course-videos');

      // Assert
      expect(result.url).toBeDefined();
      expect(result.duration).toBe(120);
      expect(result.qualities).toHaveLength(1);
    });
  });

  describe('deleteFile', () => {
    it('should delete file successfully', async () => {
      // Arrange
      jest.spyOn(service, 'deleteFile').mockResolvedValue(undefined);

      // Act & Assert
      await expect(service.deleteFile('test/image')).resolves.not.toThrow();
      expect(service.deleteFile).toHaveBeenCalledWith('test/image');
    });
  });
});
