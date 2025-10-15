import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { CourseContentService } from './course-content.service';
import { SubmitQuizDto } from './dto/submit-quiz.dto';
import { BatchSaveContentDto } from './dto/batch-save-content.dto';
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

  @Post('course/:courseId/batch-content')
  @UseGuards(JwtAuthGuard)
  @ResponseMessage('Batch save course content')
  async batchSaveCourseContent(
    @Param('courseId') courseId: number,
    @Body() batchDto: BatchSaveContentDto,
  ) {
    return this.courseContentService.batchSaveCourseContent(
      courseId,
      batchDto.sections,
    );
  }

  @Public()
  @Get('course/:courseId/structure')
  @ResponseMessage('Get course structure')
  async getCourseStructure(@Param('courseId') courseId: string) {
    return this.courseContentService.getCourseStructure(+courseId);
  }

  // ========================
  // DELETE OPERATIONS
  // ========================

  @Delete('sections/:sectionId')
  @UseGuards(JwtAuthGuard)
  @ResponseMessage('Delete course section')
  async deleteSection(@Param('sectionId') sectionId: string) {
    await this.courseContentService.deleteSection(sectionId);
    return { message: 'Section deleted successfully' };
  }

  @Delete('lectures/:lectureId')
  @UseGuards(JwtAuthGuard)
  @ResponseMessage('Delete lecture')
  async deleteLecture(@Param('lectureId') lectureId: string) {
    await this.courseContentService.deleteLecture(lectureId);
    return { message: 'Lecture deleted successfully' };
  }

  // ========================
  // LECTURE DETAILS
  // ========================

  @Public()
  @Get('lectures/:lectureId')
  @ResponseMessage('Get lecture details')
  async getLecture(@Param('lectureId') lectureId: string) {
    return this.courseContentService.getLecture(lectureId);
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
      fileSize: file?.size,
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
  async getCaptions(@Param('lectureId') lectureId: string) {
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
    @Body()
    progressData: {
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
    return this.courseContentService.getCourseProgress(
      +enrollmentId,
      +courseId,
    );
  }

  // ========================
  // QUIZ SUBMISSION
  // ========================

  @Post('quiz/submit')
  @UseGuards(JwtAuthGuard)
  @ResponseMessage('Submit quiz answers')
  async submitQuiz(@Body() submitQuizDto: SubmitQuizDto) {
    return this.courseContentService.submitQuiz(
      submitQuizDto.enrollmentId,
      submitQuizDto.lectureId,
      submitQuizDto.answers,
    );
  }
}
