import { Injectable, BadRequestException } from '@nestjs/common';
import { Readable } from 'stream';
import cloudinary from './cloudinary.config';

@Injectable()
export class CloudinaryService {
  async uploadImage(
    file: Express.Multer.File,
    folder: string,
  ): Promise<string> {
    try {
      const result = await new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder,
            resource_type: 'image',
          },
          (error, result) => {
            if (error) return reject(error);
            resolve(result);
          },
        );
        const buffer = Readable.from(file.buffer);
        buffer.pipe(uploadStream);
      });

      return result['secure_url'];
    } catch (error) {
      throw new BadRequestException('Failed to upload image');
    }
  }

  async uploadVideo(
    file: Express.Multer.File,
    folder: string,
  ): Promise<{ url: string; duration: number; publicId: string }> {
    try {
      const result = await new Promise<any>((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder,
            resource_type: 'video',
            raw_convert: 'google_speech:srt:vtt',
          },
          (error, result) => {
            if (error) return reject(error);
            resolve(result);
          },
        );
        Readable.from(file.buffer).pipe(uploadStream);
      });

      return {
        url: result.secure_url,
        duration: result.duration,
        publicId: result.public_id,
      };
    } catch (error) {
      throw new BadRequestException('Failed to upload video');
    }
  }

  async uploadStream(streamUrl: string, folder: string): Promise<string> {
    try {
      const result = await cloudinary.uploader.upload(streamUrl, {
        folder,
        resource_type: 'video',
        streaming_profile: 'hd',
      });

      return result.secure_url;
    } catch (error) {
      throw new BadRequestException('Failed to upload stream');
    }
  }

  async deleteFile(publicId: string): Promise<void> {
    try {
      await cloudinary.uploader.destroy(publicId);
    } catch (error) {
      throw new BadRequestException('Failed to delete file');
    }
  }

  extractPublicId(url: string): string {
    const parts = url.split('/');
    const fileName = parts[parts.length - 1];
    return fileName.split('.')[0]; // Remove .jpg or .mp4
  }


  getCaptionUrl(videoPublicId: string, format: 'srt' | 'vtt' | 'transcript'): string {
    return cloudinary.url(`${videoPublicId}.${format}`, {
      resource_type: 'raw',
      type: 'upload',
    });
  }

  getVideoWithSubtitles(videoPublicId: string, subtitleFormat: 'srt' | 'vtt' = 'srt'): string {
    return cloudinary.url(videoPublicId, {
      resource_type: 'video',
      transformation: [
        { overlay: `subtitles:${videoPublicId}.${subtitleFormat}` },
        { flags: 'layer_apply' }
      ]
    });
  }
}
