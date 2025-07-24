import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  ParseIntPipe,
  Query,
} from '@nestjs/common';
import { CertificationService } from './certification.service';
import { Certification } from 'src/entities/certification.entity';
import { PageOptionsDto } from 'src/common/dtos/page-option.dto';
import { ResponsePaginate } from 'src/common/dtos/response-paginate.dto';

@Controller('certifications')
export class CertificationController {
  constructor(private readonly certificationService: CertificationService) {}

  @Get()
  findAll(
    @Query() pageOptionsDto: PageOptionsDto,
  ): Promise<ResponsePaginate<Certification>> {
    return this.certificationService.findAll(pageOptionsDto);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number): Promise<Certification> {
    return this.certificationService.findOne(id);
  }

  @Post()
  create(
    @Body() certification: Partial<Certification>,
  ): Promise<Certification> {
    return this.certificationService.create(certification);
  }

  @Get('user/:userId')
  findByUser(
    @Param('userId', ParseIntPipe) userId: number,
    @Query() pageOptionsDto: PageOptionsDto,
  ): Promise<ResponsePaginate<Certification>> {
    return this.certificationService.findByUser(userId, pageOptionsDto);
  }

  @Get('course/:courseId')
  findByCourse(
    @Param('courseId', ParseIntPipe) courseId: number,
    @Query() pageOptionsDto: PageOptionsDto,
  ): Promise<ResponsePaginate<Certification>> {
    return this.certificationService.findByCourse(courseId, pageOptionsDto);
  }

  @Get('verify/:id')
  verify(@Param('id', ParseIntPipe) id: number): Promise<Certification> {
    return this.certificationService.verify(id);
  }
}
