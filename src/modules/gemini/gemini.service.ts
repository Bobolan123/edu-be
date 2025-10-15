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

  /**
   * Detect if the text is primarily Vietnamese
   */
  private isVietnamese(text: string): boolean {
    const vietnameseChars =
      /[àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ]/i;
    const vietnameseWords =
      /\b(là|của|và|có|được|trong|này|cho|với|các|những|như|về|đã|sẽ|không|tôi|bạn|chúng|một|hay|để|khi|hoặc|nhưng)\b/i;

    return vietnameseChars.test(text) || vietnameseWords.test(text);
  }

  async generateChatWithRAG(prompt: string, courseId: number) {
    try {
      this.logger.log(`RAG query for course ${courseId}: ${prompt}`);

      const isVietnamese = this.isVietnamese(prompt);
      this.logger.log(
        `Detected language: ${isVietnamese ? 'Vietnamese' : 'English'}`,
      );

      const queryEmbedding = await this.generateEmbedding(prompt);
      this.logger.log('Generated query embedding');

      const searchResults = await this.qdrantService.searchByCourse(
        courseId,
        queryEmbedding,
        5,
      );

      this.logger.log(`Found ${searchResults.length} relevant chunks`);

      // Step 4: Build augmented prompt with context
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

      // Step 5: Add language-specific instructions
      if (isVietnamese) {
        augmentedPrompt += `Hướng dẫn:
- Bạn là một trợ giảng thân thiện và nhiệt tình, đang giúp đỡ sinh viên
- Trả lời bằng tiếng Việt một cách tự nhiên, lịch sự và dễ hiểu
- Sử dụng thông tin từ tài liệu khóa học ở trên để đưa ra câu trả lời chính xác và chi tiết
- Giữ giọng điệu thân thiện, rõ ràng và mang tính giáo dục
- Không đề cập "dựa trên ngữ cảnh" hay "theo tài liệu" - chỉ cần trả lời trực tiếp
- Nếu ngữ cảnh không chứa câu trả lời, hãy lịch sự nói rằng bạn không có thông tin đó trong tài liệu khóa học này
- Sử dụng ví dụ từ ngữ cảnh khi hữu ích
- Chia nhỏ các chủ đề phức tạp thành những giải thích đơn giản, dễ hiểu
- Thể hiện sự kiên nhẫn và sẵn sàng giúp đỡ như một người thầy/cô tốt
- Kết thúc câu trả lời bằng cách khuyến khích học sinh hỏi thêm nếu cần`;
      } else {
        augmentedPrompt += `Instructions:
- You are a friendly and enthusiastic teaching assistant helping students
- Answer in English naturally, politely, and clearly
- Use the context provided above to give accurate, specific information
- Keep the tone warm, friendly, clear, and educational
- Don't mention "based on the context" or "according to the materials" - just answer directly
- If the context doesn't contain the answer, politely say you don't have that information in this course's materials
- Use examples from the context when helpful
- Break down complex topics into simple, easy-to-understand explanations
- Show patience and willingness to help like a good teacher
- End your response by encouraging the student to ask more questions if needed`;
      }

      this.logger.log('Generated augmented prompt');

      // Step 6: Call Gemini with augmented prompt
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
