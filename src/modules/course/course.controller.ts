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
} from '@nestjs/common';
import { CourseService } from './course.service';
import { CreateCourseDto } from './dto/create-course.dto';
import { ResponseMessage } from 'src/decorator/responseMessage.decorator';
import { UpdateCourseDto } from './dto/update-course.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { PageOptionsDto } from 'src/common/dtos';
import { Category } from 'src/entities/category.entity';

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
  findAll(@Query() pageOptionsDto: PageOptionsDto ) {
    return this.courseService.findAll(pageOptionsDto);
  }

  @Get('by-category')
  @ResponseMessage('Fetch Courses by Category IDs')
  findCoursesByCategory(@Query('ids') ids: string) {
    const categoryIds = ids.split(',').map(Number); 
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
  @ResponseMessage('Delete a Course')
  remove(@Param('id') id: string) {
    return this.courseService.remove(+id);
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
}
