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
<<<<<<< HEAD
=======
    languageCode?: 'en' | 'vi',
>>>>>>> detached-work
  ): Promise<{ transcriptId: string }> {
    if (!this.client) {
      throw new BadRequestException(
        'Transcription service not configured. Please set ASSEMBLYAI_API_KEY.',
      );
    }

    try {
<<<<<<< HEAD
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
=======
      const language = languageCode || 'auto-detect';
      this.logger.log(
        `Submitting ${language.toUpperCase()} transcription job for video: ${videoUrl}`,
      );

      // Submit transcription job (non-blocking, returns immediately)
      const config: any = {
        audio: videoUrl,
        speaker_labels: false,
        punctuate: true,
        format_text: true,
      };

      // Use language_code if specified, otherwise auto-detect
      if (languageCode) {
        config.language_code = languageCode;
      } else {
        config.language_detection = true;
      }

      const transcript = await this.client.transcripts.submit(config);

      this.logger.log(
        `${language.toUpperCase()} transcription job submitted: ${transcript.id} (status: ${transcript.status})`,
>>>>>>> detached-work
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

<<<<<<< HEAD
  async transcribeVideoUrl(
    videoUrl: string,
  ): Promise<{
    transcriptId: string;
    text: string;
    srtUrl: string;
    vttUrl: string;
    words: Array<{ text: string; start: number; end: number; confidence: number }>;
  }> {
    if (!this.client) {
      throw new BadRequestException(
        'Transcription service not configured. Please set ASSEMBLYAI_API_KEY.',
      );
    }

    try {
      this.logger.log(`Starting transcription for video: ${videoUrl}`);

      // Submit and wait for transcription (blocking - used for sync processing)
      const transcript = await this.client.transcripts.transcribe({
        audio: videoUrl,
        language_detection: true,
        speaker_labels: false,
        punctuate: true,
        format_text: true,
      });

      if (transcript.status === 'error') {
        throw new Error(
          `Transcription failed: ${transcript.error || 'Unknown error'}`,
        );
      }

      this.logger.log(`Transcription completed: ${transcript.id}`);

      // Get SRT and VTT formats
      const srt = await this.client.transcripts.subtitles(transcript.id, 'srt');
      const vtt = await this.client.transcripts.subtitles(transcript.id, 'vtt');

      return {
        transcriptId: transcript.id,
        text: transcript.text || '',
        srtUrl: srt,
        vttUrl: vtt,
        words: transcript.words || [],
      };
    } catch (error) {
      this.logger.error('Transcription error:', error);
      throw new BadRequestException(
        `Failed to transcribe video: ${error.message}`,
      );
    }
  }

=======
>>>>>>> detached-work
  async pollTranscriptionStatus(
    transcriptId: string,
  ): Promise<{
    status: 'queued' | 'processing' | 'completed' | 'error';
<<<<<<< HEAD
    text?: string;
    srt?: string;
    vtt?: string;
    words?: Array<{ text: string; start: number; end: number; confidence: number }>;
=======
    srtContent?: string;
    vttContent?: string;
>>>>>>> detached-work
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
<<<<<<< HEAD
        const srt = await this.client.transcripts.subtitles(
          transcript.id,
          'srt',
        );
        const vtt = await this.client.transcripts.subtitles(
=======
        // Download SRT and VTT content from AssemblyAI
        const srtContent = await this.client.transcripts.subtitles(
          transcript.id,
          'srt',
        );
        const vttContent = await this.client.transcripts.subtitles(
>>>>>>> detached-work
          transcript.id,
          'vtt',
        );

        return {
          status: 'completed',
<<<<<<< HEAD
          text: transcript.text || '',
          srt: srt,
          vtt: vtt,
          words: transcript.words || [],
=======
          srtContent: srtContent,
          vttContent: vttContent,
>>>>>>> detached-work
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

<<<<<<< HEAD
  async getTranscript(
    transcriptId: string,
  ): Promise<{
    text: string;
    srtUrl: string;
    vttUrl: string;
  }> {
    if (!this.client) {
      throw new BadRequestException(
        'Transcription service not configured. Please set ASSEMBLYAI_API_KEY.',
      );
    }

    try {
      const transcript = await this.client.transcripts.get(transcriptId);

      if (transcript.status === 'error') {
        throw new Error(
          `Transcription retrieval failed: ${transcript.error || 'Unknown error'}`,
        );
      }

      const srt = await this.client.transcripts.subtitles(transcript.id, 'srt');
      const vtt = await this.client.transcripts.subtitles(transcript.id, 'vtt');

      return {
        text: transcript.text || '',
        srtUrl: srt,
        vttUrl: vtt,
      };
    } catch (error) {
      this.logger.error('Failed to retrieve transcript:', error);
      throw new BadRequestException(
        `Failed to retrieve transcript: ${error.message}`,
      );
    }
  }

  async deleteTranscript(transcriptId: string): Promise<void> {
    if (!this.client) {
      return;
    }

    try {
      await this.client.transcripts.delete(transcriptId);
      this.logger.log(`Transcript deleted: ${transcriptId}`);
    } catch (error) {
      this.logger.error(`Failed to delete transcript ${transcriptId}:`, error);
      // Don't throw error for deletion failures
    }
  }

=======
>>>>>>> detached-work
  isConfigured(): boolean {
    return !!this.client;
  }
}
