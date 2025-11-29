import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client } from '@elastic/elasticsearch';
import {
  CourseDocument,
  CourseSearchResult,
} from './interfaces/course-document.interface';

@Injectable()
export class ElasticsearchService implements OnModuleInit {
  private readonly logger = new Logger(ElasticsearchService.name);
  private readonly client: Client | null = null; // Allow client to be null
  private readonly coursesIndex: string;
  private readonly isEnabled: boolean = false;

  constructor(private readonly configService: ConfigService) {
    const node = this.configService.get<string>('ELASTICSEARCH_NODE');
    this.coursesIndex = this.configService.get<string>(
      'ELASTICSEARCH_INDEX_COURSES',
      'courses',
    );

    // Only initialize client if a Node URL is provided
    if (node) {
      this.client = new Client({
        node,
        requestTimeout: 30000,
        maxRetries: 3,
      });
      this.isEnabled = true;
    } else {
      this.logger.warn(
        'ELASTICSEARCH_NODE not defined. Elasticsearch features will be DISABLED.',
      );
    }
  }

  async onModuleInit() {
    if (!this.isEnabled) return;
    await this.ensureConnection();
    await this.createCoursesIndex();
  }

  private async ensureConnection() {
    if (!this.client) return;
    try {
      const health = await this.client.cluster.health();
      this.logger.log(
        `Connected to Elasticsearch cluster: ${health.cluster_name}`,
      );
    } catch (error) {
      this.logger.error('Failed to connect to Elasticsearch', error.stack);
    }
  }

  async createCoursesIndex() {
    if (!this.client) return;
    try {
      const indexExists = await this.client.indices.exists({
        index: this.coursesIndex,
      });

      if (!indexExists) {
        await this.client.indices.create({
          index: this.coursesIndex,
          settings: {
            number_of_shards: 1,
            number_of_replicas: 0,
            analysis: {
              analyzer: {
                course_analyzer: {
                  type: 'custom',
                  tokenizer: 'standard',
                  filter: ['lowercase', 'asciifolding', 'stop', 'snowball'],
                },
                autocomplete_analyzer: {
                  type: 'custom',
                  tokenizer: 'standard',
                  filter: [
                    'lowercase',
                    'asciifolding',
                    'autocomplete_filter',
                  ],
                },
                autocomplete_search_analyzer: {
                  type: 'custom',
                  tokenizer: 'standard',
                  filter: ['lowercase', 'asciifolding'],
                },
              },
              filter: {
                autocomplete_filter: {
                  type: 'edge_ngram',
                  min_gram: 2,
                  max_gram: 20,
                },
              },
            },
          },
          mappings: {
            properties: {
              id: { type: 'integer' },
              title: {
                type: 'text',
                analyzer: 'course_analyzer',
                fields: {
                  keyword: { type: 'keyword' },
                  autocomplete: {
                    type: 'text',
                    analyzer: 'autocomplete_analyzer',
                    search_analyzer: 'autocomplete_search_analyzer',
                  },
                },
              },
              description: {
                type: 'text',
                analyzer: 'course_analyzer',
              },
              language: {
                type: 'keyword',
              },
              price: { type: 'float' },
              isActive: { type: 'boolean' },
              average_rating: { type: 'float' },
              total_reviews: { type: 'integer' },
              date_created: { type: 'date' },
              last_updated: { type: 'date' },

              // Nested objects
              instructor: {
                type: 'object',
                properties: {
                  id: { type: 'integer' },
                  name: {
                    type: 'text',
                    analyzer: 'course_analyzer',
                    fields: {
                      keyword: { type: 'keyword' },
                    },
                  },
                  email: { type: 'keyword' },
                },
              },

              categories: {
                type: 'nested',
                properties: {
                  id: { type: 'integer' },
                  name: {
                    type: 'text',
                    analyzer: 'course_analyzer',
                    fields: {
                      keyword: { type: 'keyword' },
                    },
                  },
                },
              },

              metadata: {
                type: 'object',
                properties: {
                  language: { type: 'keyword' },
                  level: { type: 'keyword' },
                  whatYoullLearn: {
                    type: 'text',
                    analyzer: 'course_analyzer',
                  },
                },
              },

              // Computed fields
              sections_count: { type: 'integer' },
              lectures_count: { type: 'integer' },
              total_duration_seconds: { type: 'integer' },
            },
          },
        });

        this.logger.log(`Created Elasticsearch index: ${this.coursesIndex}`);
      } else {
        this.logger.log(
          `Elasticsearch index already exists: ${this.coursesIndex}`,
        );
      }
    } catch (error) {
      this.logger.error('Failed to create courses index', error.stack);
    }
  }

  async indexCourse(course: CourseDocument): Promise<void> {
    if (!this.client) return; // Bypass if disabled
    try {
      await this.client.index({
        index: this.coursesIndex,
        id: course.id.toString(),
        document: course,
        refresh: 'wait_for',
      });

      this.logger.log(`Indexed course: ${course.id} - ${course.title}`);
    } catch (error) {
      this.logger.error(
        `Failed to index course ${course.id}`,
        error.stack,
      );
      // We don't throw error here to prevent breaking the main app flow
    }
  }

  async bulkIndexCourses(courses: CourseDocument[]): Promise<void> {
    if (!this.client || courses.length === 0) return; // Bypass if disabled

    try {
      const operations = courses.flatMap((course) => [
        { index: { _index: this.coursesIndex, _id: course.id.toString() } },
        course,
      ]);

      const bulkResponse = await this.client.bulk({
        refresh: 'wait_for',
        operations,
      });

      if (bulkResponse.errors) {
        const erroredDocuments = [];
        bulkResponse.items.forEach((action, i) => {
          const operation = Object.keys(action)[0];
          if (action[operation].error) {
            erroredDocuments.push({
              status: action[operation].status,
              error: action[operation].error,
              operation: operations[i * 2],
              document: operations[i * 2 + 1],
            });
          }
        });
        this.logger.error(
          'Bulk indexing errors:',
          JSON.stringify(erroredDocuments, null, 2),
        );
      }

      this.logger.log(`Bulk indexed ${courses.length} courses`);
    } catch (error) {
      this.logger.error('Failed to bulk index courses', error.stack);
    }
  }

  async updateCourse(
    courseId: number,
    updates: Partial<CourseDocument>,
  ): Promise<void> {
    if (!this.client) return; // Bypass if disabled
    try {
      await this.client.update({
        index: this.coursesIndex,
        id: courseId.toString(),
        doc: updates,
        refresh: 'wait_for',
      });

      this.logger.log(`Updated course: ${courseId}`);
    } catch (error) {
      this.logger.error(`Failed to update course ${courseId}`, error.stack);
    }
  }

  async deleteCourse(courseId: number): Promise<void> {
    if (!this.client) return; // Bypass if disabled
    try {
      await this.client.delete({
        index: this.coursesIndex,
        id: courseId.toString(),
        refresh: 'wait_for',
      });

      this.logger.log(`Deleted course from index: ${courseId}`);
    } catch (error) {
      if (error.meta?.statusCode !== 404) {
        this.logger.error(
          `Failed to delete course ${courseId}`,
          error.stack,
        );
      }
    }
  }

  async searchCourses(params: {
    query?: string;
    filters?: {
      categoryIds?: number[];
      instructorId?: number;
      minPrice?: number;
      maxPrice?: number;
      minRating?: number;
      maxRating?: number;
      language?: string;
      level?: string;
      isActive?: boolean;
    };
    sort?: {
      field: string;
      order: 'asc' | 'desc';
    };
    page?: number;
    pageSize?: number;
  }): Promise<CourseSearchResult> {
    // If disabled, return empty result immediately
    if (!this.client) {
      this.logger.warn('Search attempted but Elasticsearch is disabled.');
      return {
        documents: [],
        total: 0,
        page: params.page || 1,
        pageSize: params.pageSize || 10,
      };
    }

    const {
      query = '',
      filters = {},
      sort = { field: '_score', order: 'desc' },
      page = 1,
      pageSize = 10,
    } = params;

    const from = (page - 1) * pageSize;

    // Build the query
    const must: any[] = [];
    const filter: any[] = [];

    // Text search - optimized for autocomplete (gets MORE results with SHORT queries)
    if (query) {
      const lowerQuery = query.toLowerCase();

      // Use 'should' to make search very lenient (more results)
      const searchQuery: any = {
        bool: {
          should: [
            // Wildcard on title - matches anywhere (SQL → "SQL...", "...SQL...")
            {
              wildcard: {
                'title.keyword': {
                  value: `*${lowerQuery}*`,
                  case_insensitive: true,
                  boost: 5, // Highest priority
                },
              },
            },
            // Wildcard on description
            {
              wildcard: {
                description: {
                  value: `*${lowerQuery}*`,
                  case_insensitive: true,
                  boost: 2,
                },
              },
            },
            // Autocomplete field (prefix matching)
            {
              match: {
                'title.autocomplete': {
                  query,
                  boost: 4,
                },
              },
            },
            // Regular multi-field search
            {
              multi_match: {
                query,
                fields: [
                  'title^3',
                  'description^2',
                  'instructor.name^2',
                  'categories.name',
                  'metadata.whatYoullLearn',
                ],
                type: 'best_fields',
                operator: 'or', // OR operator for lenient matching
                fuzziness: 'AUTO',
              },
            },
          ],
          minimum_should_match: 1, // Just need to match 1 field
        },
      };

      must.push(searchQuery);
    }

    // Category filter (nested)
    if (filters.categoryIds?.length > 0) {
      filter.push({
        nested: {
          path: 'categories',
          query: {
            terms: {
              'categories.id': filters.categoryIds,
            },
          },
        },
      });
    }

    // Instructor filter
    if (filters.instructorId) {
      filter.push({
        term: { 'instructor.id': filters.instructorId },
      });
    }

    // Price range filter
    if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
      const priceRange: any = {};
      if (filters.minPrice !== undefined) priceRange.gte = filters.minPrice;
      if (filters.maxPrice !== undefined) priceRange.lte = filters.maxPrice;
      filter.push({ range: { price: priceRange } });
    }

    // Rating range filter
    if (filters.minRating !== undefined || filters.maxRating !== undefined) {
      const ratingRange: any = {};
      if (filters.minRating !== undefined) ratingRange.gte = filters.minRating;
      if (filters.maxRating !== undefined) ratingRange.lte = filters.maxRating;
      filter.push({ range: { average_rating: ratingRange } });
    }

    // Language filter
    if (filters.language) {
      filter.push({ term: { language: filters.language } });
    }

    // Level filter
    if (filters.level) {
      filter.push({ term: { 'metadata.level': filters.level } });
    }

    // Active status filter
    if (filters.isActive !== undefined) {
      filter.push({ term: { isActive: filters.isActive } });
    }

    // Build sort (always by relevance for simple search)
    const sortField = sort.field === '_score' ? '_score' : sort.field;
    const sortOrder = sort.order;

    try {
      const response = await this.client.search({
        index: this.coursesIndex,
        query: {
          bool: {
            must: must.length > 0 ? must : [{ match_all: {} }],
            filter,
          },
        },
        sort: [{ [sortField]: { order: sortOrder } }],
        from,
        size: pageSize,
      });

      const hits = response.hits.hits;
      const total =
        typeof response.hits.total === 'number'
          ? response.hits.total
          : response.hits.total?.value || 0;

      const documents = hits.map((hit) => hit._source as CourseDocument);

      return {
        documents,
        total,
        page,
        pageSize,
      };
    } catch (error) {
      this.logger.error('Failed to search courses', error.stack);
      throw error;
    }
  }

  async deleteIndex(): Promise<void> {
    if (!this.client) return;
    try {
      await this.client.indices.delete({
        index: this.coursesIndex,
      });
      this.logger.log(`Deleted index: ${this.coursesIndex}`);
    } catch (error) {
      this.logger.error('Failed to delete index', error.stack);
      throw error;
    }
  }

  getClient(): Client | null {
    return this.client;
  }
}