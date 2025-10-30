import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './common/database/database.module';
import { ConfigModule } from '@nestjs/config';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { EventEmitterModule } from '@nestjs/event-emitter';
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
import { SupportTicketModule } from './modules/support-ticket/support-ticket.module';
import { AutoPermissionService } from './common/database/seeders/auto-permission.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { Role } from './entities/role.entity';
import { SeedUsersService } from './common/database/seeders/seed-users.service';
import { SeedAllService } from './common/database/seeders/seed-all.service';
import { Permission } from './entities/permission.entity';
import { Category } from './entities/category.entity';
import { Course } from './entities/course.entity';
import { CourseSection } from './entities/course-section.entity';
import { CourseLecture } from './entities/course-lecture.entity';
import { Enrollment } from './entities/enrollment.entity';
import { Review } from './entities/review.entity';
import { ReviewVote } from './entities/review-vote.entity';
import { Order } from './entities/order.entity';
import { OrderCourse } from './entities/order-course.entity';
import { SupportTicket } from './entities/support-ticket.entity';
import { Cart } from './entities/cart.entity';
import { CartItem } from './entities/cartItem.entity';
import { MongooseModule } from '@nestjs/mongoose';
import {
  TicketMessage,
  TicketMessageSchema,
} from './schemas/ticket-message.schema';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ScheduleModule.forRoot(),
    EventEmitterModule.forRoot(),
    DatabaseModule,
    TypeOrmModule.forFeature([
      User,
      Role,
      Permission,
      Category,
      Course,
      CourseSection,
      CourseLecture,
      Enrollment,
      Review,
      ReviewVote,
      Order,
      OrderCourse,
      SupportTicket,
      Cart,
      CartItem,
    ]),
    MongooseModule.forFeature([
      { name: TicketMessage.name, schema: TicketMessageSchema },
    ]),
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
    SupportTicketModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    AutoPermissionService,
    SeedUsersService,
    SeedAllService,
    {
      provide: APP_INTERCEPTOR,
      useClass: TransformResInterceptor,
    },
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}
