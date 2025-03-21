import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './common/database/database.module';
import { ConfigModule } from '@nestjs/config';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { EmailModule } from './common/email/email.module';
import { UserModule } from './modules/user/user.module';
import { RoleModule } from './modules/role/role.module';
import { CourseModule } from './modules/course/course.module';
import { EnrollmentModule } from './modules/enrollment/enrollment.module';
import { QuizzesModule } from './modules/quiz/quiz.module';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { RolesGuard } from './auth/guards/roles.guard';
import { LocalStrategy } from './auth/strategies/local.strategy';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { AuthModule } from './modules/auth/auth.module';
import { TransformResInterceptor } from './core/transformRes.interceptor';
import { PermissionModule } from './modules/permission/permission.module';
import { CloudinaryModule } from './modules/cloudinary/cloudinary.module';
import { LessonModule } from './modules/lesson/lesson.module';
import { SectionModule } from './modules/section/section.module';
import { QuestionModule } from './modules/question/question.module';
import { QuizSubmissionModule } from './modules/quiz-submission/quiz-submission.module';
import { PaymentModule } from './modules/payment/payment.module';
import { SubscriptionModule } from './modules/subscription/subscription.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    DatabaseModule,
    UserModule,
    RoleModule,
    PermissionModule,
    CourseModule,
    EnrollmentModule,
    QuizzesModule,
    EmailModule,
    AuthModule,
    //Public sources
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'public'),
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 10,
      },
    ]),
    CloudinaryModule,
    LessonModule,
    SectionModule,
    QuestionModule,
    QuizSubmissionModule,
    PaymentModule,
    SubscriptionModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_INTERCEPTOR,
      useClass: TransformResInterceptor,
    },
  ],
})
export class AppModule {}
