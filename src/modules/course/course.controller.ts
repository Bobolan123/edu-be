import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseInterceptors,
  UploadedFile,
  Query,
  UsePipes,
  ValidationPipe,
  Put,
  UseGuards,
} from '@nestjs/common';
import { CourseService } from './course.service';
import { CreateCourseDto } from './dto/create-course.dto';
import { ResponseMessage } from 'src/decorator/responseMessage.decorator';
import { UpdateCourseDto } from './dto/update-course.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { PageOptionsDto } from 'src/common/dtos';
import { CourseSearchFilterDto } from './dto/course-search-filter.dto';
import { Category } from 'src/entities/category.entity';
import { UpsertCourseContentDto } from './dto/course-content.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';

@Controller('courses')
export class CourseController {
  constructor(private readonly courseService: CourseService) {}

  @Post()
  @ResponseMessage('Create a new Course')
  create(@Body() createCourseDto: CreateCourseDto) {
    return this.courseService.create(createCourseDto);
  }

  @Get()
  @ResponseMessage('Fetch all Courses')
  @UsePipes(new ValidationPipe({ transform: true }))
  findAll(@Query() courseSearchFilterDto: CourseSearchFilterDto) {
    return this.courseService.findAll(courseSearchFilterDto);
  }

  @Get('by-category')
  @ResponseMessage('Fetch Courses by Category IDs')
  findCoursesByCategory(@Query('ids') ids: string) {
    const categoryIds = ids
      .split(',')
      .map((id) => id.trim())
      .filter((id) => /^\d+$/.test(id))
      .map(Number);

    return this.courseService.findCoursesByCategory(categoryIds);
  }

  @Get(':id')
  @ResponseMessage('Fetch a single Course')
  findOne(@Param('id') id: string) {
    return this.courseService.findOne(+id);
  }

  @Patch(':id')
  @ResponseMessage('Update a Course')
  update(@Param('id') id: string, @Body() updateCourseDto: UpdateCourseDto) {
    return this.courseService.update(+id, updateCourseDto);
  }

  @Delete(':id')
  @ResponseMessage('Soft delete a Course')
  remove(@Param('id') id: string) {
    return this.courseService.remove(+id);
  }

  @Patch(':id/restore')
  @ResponseMessage('Restore deleted Course')
  restore(@Param('id') id: string) {
    return this.courseService.restore(+id);
  }

  @Delete(':id/force')
  @ResponseMessage('Permanently delete Course')
  forceRemove(@Param('id') id: string) {
    return this.courseService.forceRemove(+id);
  }

  @Post(':id/thumbnail')
  @UseInterceptors(FileInterceptor('thumbnail'))
  @ResponseMessage('Upload course thumbnail')
  async uploadThumbnail(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.courseService.uploadThumbnail(+id, file);
  }

  @Patch('content/:courseId')
  @ResponseMessage('Update course content')
  async updateContent(
    @Param('courseId') courseId: number,
    @Body() contentDto: UpsertCourseContentDto,
  ) {
    const res = await this.courseService.upsertCourseContent(
      courseId,
      contentDto,
    );
    return res;
  }

  @Get('content/:courseId')
  @ResponseMessage('Get course content')
  async getCourseContent(@Param('courseId') courseId: number) {
    return this.courseService.getCourseContent(courseId);
  }

  @Get(':id/students')
  @UseGuards(JwtAuthGuard)
  @ResponseMessage('Get course students with progress')
  @UsePipes(new ValidationPipe({ transform: true }))
  async getCourseStudentsWithProgress(
    @Param('id') id: string,
    @Query() pageOptionsDto: PageOptionsDto,
  ) {
    return this.courseService.getCourseStudentsWithProgress(
      +id,
      pageOptionsDto,
    );
  }

  @Post(':id/thumbnail')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('thumbnail'))
  @ResponseMessage('Upload course thumbnail')
  async uploadAvatar(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.courseService.uploadThumbnail(+id, file);
  }

  @Post(':id/lecture')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('lecture'))
  @ResponseMessage('Upload course lecture')
  async uploadLecture(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @Body()
    body: { sectionId: string; lectureId: string },
  ) {
    return this.courseService.uploadLecture(
      +id,
      body.sectionId,
      body.lectureId,
      file,
    );
  }
}
