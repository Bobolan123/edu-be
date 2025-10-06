import { Injectable, Logger } from '@nestjs/common';
import { GoogleGenAI } from '@google/genai';
import { QdrantService } from '../qdrant/qdrant.service';

@Injectable()
export class GeminiService {
  private ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  private readonly logger = new Logger(GeminiService.name);

  constructor(private readonly qdrantService: QdrantService) {}

  async generateChat(prompt: string) {
    const response = await this.ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: prompt,
    });
    return response.text;
  }

  async generateEmbedding(text: string): Promise<number[]> {
    const response = await this.ai.models.embedContent({
      model: 'text-embedding-004',
      contents: text,
    });
    return response.embeddings[0].values;
  }

  async generateChatWithRAG(prompt: string, courseId: number) {
    try {
      this.logger.log(`RAG query for course ${courseId}: ${prompt}`);

      // Step 1: Generate embedding from user prompt
      const queryEmbedding = await this.generateEmbedding(prompt);
      this.logger.log('Generated query embedding');

      // Step 2: Search Qdrant for relevant context
      const searchResults = await this.qdrantService.searchByCourse(
        courseId,
        queryEmbedding,
        5, // top 5 results
      );

      this.logger.log(`Found ${searchResults.length} relevant chunks`);

      // Step 3: Build augmented prompt with context
      let augmentedPrompt = '';

      if (searchResults.length > 0) {
        augmentedPrompt += 'Context from course materials:\n\n';
        searchResults.forEach((result, idx) => {
          const payload = result.payload as any;
          augmentedPrompt += `[${idx + 1}] ${payload.text}\n\n`;
        });
        augmentedPrompt += '---\n\n';
      }

      augmentedPrompt += `User question: ${prompt}\n\n`;
      augmentedPrompt +=
        'Answer the question based on the context provided above. If the context does not contain relevant information, say so.';

      this.logger.log('Generated augmented prompt');

      // Step 4: Call Gemini with augmented prompt
      const response = await this.generateChat(augmentedPrompt);

      return {
        answer: response,
        sources: searchResults.map((r) => ({
          lectureId: (r.payload as any).lectureId,
          title: (r.payload as any).title,
          score: r.score,
        })),
      };
    } catch (error) {
      this.logger.error('Error in RAG pipeline:', error);
      throw error;
    }
  }
}
