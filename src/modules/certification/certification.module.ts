import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Certification } from 'src/entities/certification.entity';
import { CertificationService } from './certification.service';
import { CertificationController } from './certification.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Certification])],
  exports: [CertificationService],
  controllers: [CertificationController],
  providers: [CertificationService],
})
export class CertificationModule {} 