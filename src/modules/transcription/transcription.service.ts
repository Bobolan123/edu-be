import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AssemblyAI } from 'assemblyai';

@Injectable()
export class TranscriptionService {
  private readonly logger = new Logger(TranscriptionService.name);
  private client: AssemblyAI;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('ASSEMBLYAI_API_KEY');
    if (!apiKey) {
      this.logger.warn(
        'ASSEMBLYAI_API_KEY not configured. Transcription features will be disabled.',
      );
    } else {
      this.client = new AssemblyAI({
        apiKey: apiKey,
      });
    }
  }

  async submitTranscriptionJob(
    videoUrl: string,
  ): Promise<{ transcriptId: string }> {
    if (!this.client) {
      throw new BadRequestException(
        'Transcription service not configured. Please set ASSEMBLYAI_API_KEY.',
      );
    }

    try {
      this.logger.log(`Submitting transcription job for video: ${videoUrl}`);

      // Submit transcription job (non-blocking, returns immediately)
      const transcript = await this.client.transcripts.submit({
        audio: videoUrl,
        language_detection: true,
        speaker_labels: false,
        punctuate: true,
        format_text: true,
      });

      this.logger.log(
        `Transcription job submitted: ${transcript.id} (status: ${transcript.status})`,
      );

      return {
        transcriptId: transcript.id,
      };
    } catch (error) {
      this.logger.error('Failed to submit transcription job:', error);
      throw new BadRequestException(
        `Failed to submit transcription: ${error.message}`,
      );
    }
  }

  async pollTranscriptionStatus(
    transcriptId: string,
  ): Promise<{
    status: 'queued' | 'processing' | 'completed' | 'error';
    srtContent?: string;
    vttContent?: string;
    error?: string;
  }> {
    if (!this.client) {
      throw new BadRequestException(
        'Transcription service not configured. Please set ASSEMBLYAI_API_KEY.',
      );
    }

    try {
      const transcript = await this.client.transcripts.get(transcriptId);

      if (transcript.status === 'error') {
        return {
          status: 'error',
          error: transcript.error || 'Unknown error',
        };
      }

      if (transcript.status === 'completed') {
        // Download SRT and VTT content from AssemblyAI
        const srtContent = await this.client.transcripts.subtitles(
          transcript.id,
          'srt',
        );
        const vttContent = await this.client.transcripts.subtitles(
          transcript.id,
          'vtt',
        );

        return {
          status: 'completed',
          srtContent: srtContent,
          vttContent: vttContent,
        };
      }

      return {
        status: transcript.status as 'queued' | 'processing',
      };
    } catch (error) {
      this.logger.error('Failed to poll transcription status:', error);
      throw new BadRequestException(
        `Failed to check transcription status: ${error.message}`,
      );
    }
  }

  isConfigured(): boolean {
    return !!this.client;
  }
}
