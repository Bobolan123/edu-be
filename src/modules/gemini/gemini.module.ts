import { Module, forwardRef } from '@nestjs/common';
import { GeminiController } from './gemini.controller';
import { GeminiService } from './gemini.service';
import { QdrantModule } from '../qdrant/qdrant.module';

@Module({
  imports: [forwardRef(() => QdrantModule)],
  controllers: [GeminiController],
  providers: [GeminiService],
  exports: [GeminiService],
})
export class GeminiModule {}
