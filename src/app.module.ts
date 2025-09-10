import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './common/database/database.module';
import { ConfigModule } from '@nestjs/config';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { EmailModule } from './common/email/email.module';
import { UserModule } from './modules/user/user.module';
import { RoleModule } from './modules/role/role.module';
import { CourseModule } from './modules/course/course.module';
import { EnrollmentModule } from './modules/enrollment/enrollment.module';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { RolesGuard } from './auth/guards/roles.guard';
import { LocalStrategy } from './auth/strategies/local.strategy';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { TransformResInterceptor } from './core/transformRes.interceptor';
import { PermissionModule } from './modules/permission/permission.module';
import { CloudinaryModule } from './modules/cloudinary/cloudinary.module';
import { PaymentModule } from './modules/order/order.module';
import { SubscriptionModule } from './modules/subscription/subscription.module';
import { AuthModule } from './auth/auth.module';
import { CategoryModule } from './modules/category/category.module';
import { ReviewModule } from './modules/review/review.module';
import { CartModule } from './modules/cart/cart.module';
import { GeminiModule } from './modules/gemini/gemini.module';
import { AutoPermissionService } from './common/database/seeders/auto-permission.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ScheduleModule.forRoot(),
    DatabaseModule,
    UserModule,
    RoleModule,
    PermissionModule,
    CourseModule,
    EnrollmentModule,
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
    PaymentModule,
    SubscriptionModule,
    CategoryModule,
    ReviewModule,
    CartModule,
    GeminiModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    AutoPermissionService,
    {
      provide: APP_INTERCEPTOR,
      useClass: TransformResInterceptor,
    },
  ],
})
export class AppModule {}
