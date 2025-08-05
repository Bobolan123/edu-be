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
import { ResponseMessage } from 'src/decorator/responseMessage.decorator';

@Controller('certifications')
export class CertificationController {
  constructor(private readonly certificationService: CertificationService) {}

  @Get()
  @ResponseMessage('Get all certifications')
  findAll(
    @Query() pageOptionsDto: PageOptionsDto,
  ): Promise<ResponsePaginate<Certification>> {
    return this.certificationService.findAll(pageOptionsDto);
  }

  @Get(':id')
  @ResponseMessage('Get certification by ID')
  findOne(@Param('id', ParseIntPipe) id: number): Promise<Certification> {
    return this.certificationService.findOne(id);
  }

  @Post()
  @ResponseMessage('Create new certification')
  create(
    @Body() certification: Partial<Certification>,
  ): Promise<Certification> {
    return this.certificationService.create(certification);
  }

  @Get('user/:userId')
  @ResponseMessage('Get user certifications')
  findByUser(
    @Param('userId', ParseIntPipe) userId: number,
    @Query() pageOptionsDto: PageOptionsDto,
  ): Promise<ResponsePaginate<Certification>> {
    return this.certificationService.findByUser(userId, pageOptionsDto);
  }

  @Get('course/:courseId')
  @ResponseMessage('Get course certifications')
  findByCourse(
    @Param('courseId', ParseIntPipe) courseId: number,
    @Query() pageOptionsDto: PageOptionsDto,
  ): Promise<ResponsePaginate<Certification>> {
    return this.certificationService.findByCourse(courseId, pageOptionsDto);
  }

  @Get('verify/:id')
  @ResponseMessage('Verify certification')
  verify(@Param('id', ParseIntPipe) id: number): Promise<Certification> {
    return this.certificationService.verify(id);
  }
}
