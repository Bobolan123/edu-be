import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { QdrantClient } from '@qdrant/js-client-rest';

export interface LecturePayload {
  [key: string]: unknown;
  lectureId: string;
  courseId: number;
  sectionId: string;
  title: string;
  description: string;
  text: string;
}

@Injectable()
export class QdrantService implements OnModuleInit {
  private client: QdrantClient;
  private readonly collectionName = process.env.QDRANT_COLLECTION_NAME || 'course_lectures';
  private readonly logger = new Logger(QdrantService.name);
  private readonly vectorSize = 768; // Gemini embedding dimension

  constructor() {
    this.client = new QdrantClient({
      url: process.env.QDRANT_URL || 'http://localhost:6333',
      apiKey: process.env.QDRANT_API_KEY,
    });
  }

  async onModuleInit() {
    await this.ensureCollection();
  }

  private async ensureCollection() {
    try {
      const collections = await this.client.getCollections();
      const exists = collections.collections.some(
        (col) => col.name === this.collectionName,
      );

      if (!exists) {
        await this.client.createCollection(this.collectionName, {
          vectors: {
            size: this.vectorSize,
            distance: 'Cosine',
          },
        });
        this.logger.log(`Collection '${this.collectionName}' created`);
      } else {
        this.logger.log(`Collection '${this.collectionName}' already exists`);
      }
    } catch (error) {
      this.logger.error('Error ensuring collection:', error);
      throw error;
    }
  }

  async upsertVector(
    id: string,
    vector: number[],
    payload: LecturePayload,
  ): Promise<void> {
    try {
      await this.client.upsert(this.collectionName, {
        wait: true,
        points: [
          {
            id,
            vector,
            payload,
          },
        ],
      });
    } catch (error) {
      this.logger.error(`Error upserting vector for lecture ${id}:`, error);
      throw error;
    }
  }

  async searchByCourse(
    courseId: number,
    queryVector: number[],
    limit: number = 5,
  ) {
    try {
      const searchResult = await this.client.search(this.collectionName, {
        vector: queryVector,
        limit,
        filter: {
          must: [
            {
              key: 'courseId',
              match: {
                value: courseId,
              },
            },
          ],
        },
      });

      return searchResult;
    } catch (error) {
      this.logger.error(
        `Error searching vectors for course ${courseId}:`,
        error,
      );
      throw error;
    }
  }

  async deleteCollection(): Promise<void> {
    try {
      await this.client.deleteCollection(this.collectionName);
      this.logger.log(`Collection '${this.collectionName}' deleted`);
    } catch (error) {
      this.logger.error('Error deleting collection:', error);
      throw error;
    }
  }
}
