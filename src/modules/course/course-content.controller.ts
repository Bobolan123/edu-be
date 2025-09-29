import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Put,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { CourseContentService } from './course-content.service';
import { CreateSectionDto } from './dto/create-section.dto';
import { UpdateSectionDto } from './dto/update-section.dto';
import { CreateLectureDto } from './dto/create-lecture.dto';
import { UpdateLectureDto } from './dto/update-lecture.dto';
import { UpsertCourseContentDto } from './dto/course-content.dto';
import { ResponseMessage } from 'src/decorator/responseMessage.decorator';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { Public } from 'src/auth/Public';
import { FileInterceptor } from '@nestjs/platform-express';

@Controller('course-content')
export class CourseContentController {
  constructor(private readonly courseContentService: CourseContentService) {}

  // ========================
  // COURSE CONTENT MANAGEMENT
  // ========================

  @Public()
  @Get(':courseId/content')
  @ResponseMessage('Get course content')
  async getCourseContent(@Param('courseId') courseId: number) {
    return this.courseContentService.getCourseContent(courseId);
  }

  @Patch(':courseId/content')
  @UseGuards(JwtAuthGuard)
  @ResponseMessage('Update course content')
  async updateCourseContent(
    @Param('courseId') courseId: number,
    @Body() contentDto: UpsertCourseContentDto,
  ) {
    const res = await this.courseContentService.upsertCourseContent(
      courseId,
      contentDto,
    );
    return res;
  }

  @Public()
  @Get('course/:courseId/structure')
  @ResponseMessage('Get course structure')
  async getCourseStructure(@Param('courseId') courseId: string) {
    return this.courseContentService.getCourseStructure(+courseId);
  }

  // ========================
  // SECTION MANAGEMENT
  // ========================

  @Post('course/:courseId/sections')
  @UseGuards(JwtAuthGuard)
  @ResponseMessage('Create course section')
  async createSection(
    @Param('courseId') courseId: string,
    @Body() createSectionDto: CreateSectionDto,
  ) {
    return this.courseContentService.createSection(+courseId, createSectionDto);
  }

  @Patch('sections/:sectionId')
  @UseGuards(JwtAuthGuard)
  @ResponseMessage('Update course section')
  async updateSection(
    @Param('sectionId') sectionId: string,
    @Body() updateSectionDto: UpdateSectionDto,
  ) {
    return this.courseContentService.updateSection(sectionId, updateSectionDto);
  }

  @Delete('sections/:sectionId')
  @UseGuards(JwtAuthGuard)
  @ResponseMessage('Delete course section')
  async deleteSection(@Param('sectionId') sectionId: string) {
    await this.courseContentService.deleteSection(sectionId);
    return { message: 'Section deleted successfully' };
  }

  @Put('course/:courseId/sections/reorder')
  @UseGuards(JwtAuthGuard)
  @ResponseMessage('Reorder course sections')
  async reorderSections(
    @Param('courseId') courseId: string,
    @Body() body: { sectionIds: string[] },
  ) {
    await this.courseContentService.reorderSections(+courseId, body.sectionIds);
    return { message: 'Sections reordered successfully' };
  }

  // ========================
  // LECTURE MANAGEMENT
  // ========================

  @Post('sections/:sectionId/lectures')
  @UseGuards(JwtAuthGuard)
  @ResponseMessage('Create lecture')
  async createLecture(
    @Param('sectionId') sectionId: string,
    @Body() createLectureDto: CreateLectureDto,
  ) {
    return this.courseContentService.createLecture(sectionId, createLectureDto);
  }

  @Public()
  @Get('lectures/:lectureId')
  @ResponseMessage('Get lecture details')
  async getLecture(@Param('lectureId') lectureId: string) {
    return this.courseContentService.getLecture(lectureId);
  }

  @Patch('lectures/:lectureId')
  @UseGuards(JwtAuthGuard)
  @ResponseMessage('Update lecture')
  async updateLecture(
    @Param('lectureId') lectureId: string,
    @Body() updateLectureDto: UpdateLectureDto,
  ) {
    return this.courseContentService.updateLecture(lectureId, updateLectureDto);
  }

  @Delete('lectures/:lectureId')
  @UseGuards(JwtAuthGuard)
  @ResponseMessage('Delete lecture')
  async deleteLecture(@Param('lectureId') lectureId: string) {
    await this.courseContentService.deleteLecture(lectureId);
    return { message: 'Lecture deleted successfully' };
  }

  @Put('sections/:sectionId/lectures/reorder')
  @UseGuards(JwtAuthGuard)
  @ResponseMessage('Reorder section lectures')
  async reorderLectures(
    @Param('sectionId') sectionId: string,
    @Body() body: { lectureIds: string[] },
  ) {
    await this.courseContentService.reorderLectures(sectionId, body.lectureIds);
    return { message: 'Lectures reordered successfully' };
  }

  // ========================
  // MEDIA & FILE MANAGEMENT
  // ========================

  @Post(':courseId/lecture')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('lecture'))
  @ResponseMessage('Upload course lecture')
  async uploadLecture(
    @Param('courseId') courseId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body()
    body: { sectionId: string; lectureId: string },
  ) {
    console.log('Upload lecture endpoint called:', {
      courseId: courseId,
      sectionId: body.sectionId,
      lectureId: body.lectureId,
      fileExists: !!file,
      fileName: file?.originalname,
      fileSize: file?.size
    });

    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    if (!body.sectionId || !body.lectureId) {
      throw new BadRequestException('sectionId and lectureId are required');
    }

    return this.courseContentService.uploadLecture(
      +courseId,
      body.sectionId,
      body.lectureId,
      file,
    );
  }

  @Public()
  @Get('lecture/:lectureId/captions')
  @ResponseMessage('Get lecture captions')
  async getCaptions(
    @Param('lectureId') lectureId: string,
  ) {
    return this.courseContentService.getCaptions(lectureId);
  }

  // ========================
  // PROGRESS TRACKING
  // ========================

  @Post('progress/:enrollmentId/lectures/:lectureId')
  @UseGuards(JwtAuthGuard)
  @ResponseMessage('Update lecture progress')
  async updateProgress(
    @Param('enrollmentId') enrollmentId: string,
    @Param('lectureId') lectureId: string,
    @Body() progressData: {
      watchTimeSeconds?: number;
      lastPositionSeconds?: number;
      isCompleted?: boolean;
      submissionData?: any;
    },
  ) {
    return this.courseContentService.updateProgress(
      +enrollmentId,
      lectureId,
      progressData,
    );
  }

  @Get('progress/:enrollmentId/course/:courseId')
  @UseGuards(JwtAuthGuard)
  @ResponseMessage('Get course progress')
  async getCourseProgress(
    @Param('enrollmentId') enrollmentId: string,
    @Param('courseId') courseId: string,
  ) {
    return this.courseContentService.getCourseProgress(+enrollmentId, +courseId);
  }
}