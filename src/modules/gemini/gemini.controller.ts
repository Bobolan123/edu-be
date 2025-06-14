import { Controller, Post, Body } from '@nestjs/common';
import { GeminiService } from './gemini.service';
import { ResponseMessage } from 'src/decorator/responseMessage.decorator';

@Controller('gemini')
export class GeminiController {
  constructor(private readonly geminiService: GeminiService) {}

  @Post('chat')
  @ResponseMessage('Gemini response')
  async chat(@Body('prompt') prompt: string) {
    const result = await this.geminiService.generateChat(prompt);
    return result
  } 
}   
