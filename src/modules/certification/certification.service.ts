import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Certification } from 'src/entities/certification.entity';

@Injectable()
export class CertificationService {
  constructor(
    @InjectRepository(Certification)
    private certificationRepository: Repository<Certification>,
  ) {}

  async findAll(): Promise<Certification[]> {
    return this.certificationRepository.find({
      relations: ['user', 'course'],
    });
  }

  async findOne(id: number): Promise<Certification> {
    return this.certificationRepository.findOne({
      where: { id },
      relations: ['user', 'course'],
    });
  }

  async create(certification: Partial<Certification>): Promise<Certification> {
    const newCertification = this.certificationRepository.create(certification);
    return this.certificationRepository.save(newCertification);
  }

  async findByUser(userId: number): Promise<Certification[]> {
    return this.certificationRepository.find({
      where: { user: { id: userId } },
      relations: ['user', 'course'],
    });
  }

  async findByCourse(courseId: number): Promise<Certification[]> {
    return this.certificationRepository.find({
      where: { course: { id: courseId } },
      relations: ['user', 'course'],
    });
  }

  async verify(id: number): Promise<Certification> {
    const certification = await this.findOne(id);
    if (!certification) {
      return null;
    }
    return certification;
  }
} 