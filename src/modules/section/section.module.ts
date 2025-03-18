import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Section } from 'src/entities/section.entity';
import { SectionService } from './section.service';
import { SectionController } from './section.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Section])],
  exports: [SectionService],
  controllers: [SectionController],
  providers: [SectionService],
})
export class SectionModule {} 