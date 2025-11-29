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
  private readonly collectionName =
    process.env.QDRANT_COLLECTION_NAME || 'course_lectures';
  private readonly logger = new Logger(QdrantService.name);
  private readonly vectorSize = 768; // Gemini embedding dimension
  private isAvailable = false;

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
      this.isAvailable = true;
    } catch (error) {
      this.logger.warn(
        'Qdrant is not available. Vector search features will be disabled.',
      );
      this.logger.error('Error ensuring collection:', error.message);
      this.isAvailable = false;
      // Don't throw - allow app to start without Qdrant
    }
  }

  async upsertVector(
    id: string,
    vector: number[],
    payload: LecturePayload,
  ): Promise<void> {
    if (!this.isAvailable) {
      this.logger.warn('Qdrant is not available. Skipping vector upsert.');
      return;
    }

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
      // Don't throw - gracefully degrade
    }
  }

  async searchByCourse(
    courseId: number,
    queryVector: number[],
    limit: number = 5,
  ) {
    if (!this.isAvailable) {
      this.logger.warn('Qdrant is not available. Returning empty search results.');
      return [];
    }

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
      return [];
    }
  }

  async deleteVector(id: string): Promise<void> {
    if (!this.isAvailable) {
      this.logger.warn('Qdrant is not available. Skipping vector deletion.');
      return;
    }

    try {
      await this.client.delete(this.collectionName, {
        wait: true,
        points: [id],
      });
      this.logger.log(
        `Vector ${id} deleted from collection '${this.collectionName}'`,
      );
    } catch (error) {
      this.logger.error(`Error deleting vector ${id}:`, error);
      // Don't throw - gracefully degrade
    }
  }

  async deleteCollection(): Promise<void> {
    if (!this.isAvailable) {
      this.logger.warn('Qdrant is not available. Skipping collection deletion.');
      return;
    }

    try {
      await this.client.deleteCollection(this.collectionName);
      this.logger.log(`Collection '${this.collectionName}' deleted`);
    } catch (error) {
      this.logger.error('Error deleting collection:', error);
      // Don't throw - gracefully degrade
    }
  }
}
