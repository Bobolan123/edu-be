import { Controller, Post, Body } from '@nestjs/common';
import { GeminiService } from './gemini.service';
import { ResponseMessage } from 'src/decorator/responseMessage.decorator';
import { ChatRequestDto } from './dto/chat-request.dto';

@Controller('gemini')
export class GeminiController {
  constructor(private readonly geminiService: GeminiService) {}

  @Post('chat')
  @ResponseMessage('Gemini response')
  async chat(@Body() chatRequest: ChatRequestDto) {
    const result = await this.geminiService.generateChatWithRAG(
      chatRequest.prompt,
      chatRequest.courseId,
    );
    return result;
  }
}
