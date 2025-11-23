import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { PermissionService } from 'src/modules/permission/permission.service';

const PERMISSIONS_DATA = [
  // Auth Module
  {
    module: 'Auth',
    api: '/auth/login',
    method: 'POST',
    description: 'User login',
  },
  {
    module: 'Auth',
    api: '/auth/register',
    method: 'POST',
    description: 'User registration',
  },
  {
    module: 'Auth',
    api: '/auth/google',
    method: 'GET',
    description: 'Google OAuth login',
  },
  {
    module: 'Auth',
    api: '/auth/google/callback',
    method: 'GET',
    description: 'Google OAuth callback',
  },
  {
    module: 'Auth',
    api: '/auth/google-login',
    method: 'POST',
    description: 'Google login endpoint',
  },
  {
    module: 'Auth',
    api: '/auth/refresh',
    method: 'POST',
    description: 'Refresh JWT token',
  },
  {
    module: 'Auth',
    api: '/auth/verifyOtp',
    method: 'POST',
    description: 'Verify OTP code',
  },
  {
    module: 'Auth',
    api: '/auth/resendOtp',
    method: 'POST',
    description: 'Resend OTP code',
  },
  {
    module: 'Auth',
    api: '/auth/forgetPassword',
    method: 'PATCH',
    description: 'Forget password recovery',
  },
  {
    module: 'Auth',
    api: '/auth/profile',
    method: 'GET',
    description: 'Get authenticated user profile',
  },

  // User Module
  {
    module: 'User',
    api: '/users/me',
    method: 'GET',
    description: 'Get current user information',
  },
  {
    module: 'User',
    api: '/users',
    method: 'GET',
    description: 'List all users',
  },
  {
    module: 'User',
    api: '/users/:id',
    method: 'GET',
    description: 'Get user by ID',
  },
  {
    module: 'User',
    api: '/users',
    method: 'POST',
    description: 'Create new user',
  },
  {
    module: 'User',
    api: '/users/admin',
    method: 'POST',
    description: 'Create user by admin',
  },
  {
    module: 'User',
    api: '/users/:id',
    method: 'PATCH',
    description: 'Update user',
  },
  {
    module: 'User',
    api: '/users/password/:id',
    method: 'PATCH',
    description: 'Update user password',
  },
  {
    module: 'User',
    api: '/users/:id',
    method: 'DELETE',
    description: 'Soft delete user',
  },
  {
    module: 'User',
    api: '/users/:id/restore',
    method: 'PATCH',
    description: 'Restore soft-deleted user',
  },
  {
    module: 'User',
    api: '/users/:id/force',
    method: 'DELETE',
    description: 'Permanently delete user',
  },
  {
    module: 'User',
    api: '/users/:id/avatar',
    method: 'POST',
    description: 'Upload user avatar',
  },

  // Role Module
  {
    module: 'Role',
    api: '/roles',
    method: 'GET',
    description: 'List all roles',
  },
  {
    module: 'Role',
    api: '/roles/:id',
    method: 'GET',
    description: 'Get role by ID',
  },
  {
    module: 'Role',
    api: '/roles',
    method: 'POST',
    description: 'Create new role',
  },
  {
    module: 'Role',
    api: '/roles/:id',
    method: 'PATCH',
    description: 'Update role',
  },
  {
    module: 'Role',
    api: '/roles/:id',
    method: 'DELETE',
    description: 'Delete role',
  },

  // Permission Module
  {
    module: 'Permission',
    api: '/permission',
    method: 'GET',
    description: 'List all permissions',
  },
  {
    module: 'Permission',
    api: '/permission/:id',
    method: 'GET',
    description: 'Get permission by ID',
  },
  {
    module: 'Permission',
    api: '/permission',
    method: 'POST',
    description: 'Create new permission',
  },
  {
    module: 'Permission',
    api: '/permission/:id',
    method: 'PUT',
    description: 'Update permission',
  },
  {
    module: 'Permission',
    api: '/permission/:id',
    method: 'DELETE',
    description: 'Delete permission',
  },

  // Course Module
  {
    module: 'Course',
    api: '/courses',
    method: 'GET',
    description: 'List all courses',
  },
  {
    module: 'Course',
    api: '/courses/by-category',
    method: 'GET',
    description: 'Get courses by category',
  },
  {
    module: 'Course',
    api: '/courses/:id',
    method: 'GET',
    description: 'Get course by ID',
  },
  {
    module: 'Course',
    api: '/courses',
    method: 'POST',
    description: 'Create new course',
  },
  {
    module: 'Course',
    api: '/courses/:id',
    method: 'PATCH',
    description: 'Update course',
  },
  {
    module: 'Course',
    api: '/courses/:id',
    method: 'DELETE',
    description: 'Soft delete course',
  },
  {
    module: 'Course',
    api: '/courses/:id/restore',
    method: 'PATCH',
    description: 'Restore soft-deleted course',
  },
  {
    module: 'Course',
    api: '/courses/:id/force',
    method: 'DELETE',
    description: 'Permanently delete course',
  },
  {
    module: 'Course',
    api: '/courses/:id/thumbnail',
    method: 'POST',
    description: 'Upload course thumbnail',
  },
  {
    module: 'Course',
    api: '/courses/:id/students',
    method: 'GET',
    description: 'Get course students with progress',
  },

  // Course Content Module
  {
    module: 'CourseContent',
    api: '/course-content/:courseId/content',
    method: 'GET',
    description: 'Get course content',
  },
  {
    module: 'CourseContent',
    api: '/course-content/course/:courseId/batch-content',
    method: 'POST',
    description: 'Batch save course content',
  },
  {
    module: 'CourseContent',
    api: '/course-content/course/:courseId/structure',
    method: 'GET',
    description: 'Get course structure',
  },
  {
    module: 'CourseContent',
    api: '/course-content/sections/:sectionId',
    method: 'DELETE',
    description: 'Delete course section',
  },
  {
    module: 'CourseContent',
    api: '/course-content/lectures/:lectureId',
    method: 'DELETE',
    description: 'Delete lecture',
  },
  {
    module: 'CourseContent',
    api: '/course-content/lectures/:lectureId',
    method: 'GET',
    description: 'Get lecture details',
  },
  {
    module: 'CourseContent',
    api: '/course-content/:courseId/lecture',
    method: 'POST',
    description: 'Upload course lecture',
  },
  {
    module: 'CourseContent',
    api: '/course-content/lecture/:lectureId/captions',
    method: 'GET',
    description: 'Get lecture captions',
  },
  {
    module: 'CourseContent',
    api: '/course-content/progress/:enrollmentId/lectures/:lectureId',
    method: 'POST',
    description: 'Update lecture progress',
  },
  {
    module: 'CourseContent',
    api: '/course-content/progress/:enrollmentId/course/:courseId',
    method: 'GET',
    description: 'Get course progress',
  },
  {
    module: 'CourseContent',
    api: '/course-content/quiz/submit',
    method: 'POST',
    description: 'Submit quiz answers',
  },

  // Category Module
  {
    module: 'Category',
    api: '/categories',
    method: 'GET',
    description: 'List all categories',
  },
  {
    module: 'Category',
    api: '/categories/:id',
    method: 'GET',
    description: 'Get category by ID',
  },
  {
    module: 'Category',
    api: '/categories',
    method: 'POST',
    description: 'Create new category',
  },
  {
    module: 'Category',
    api: '/categories/:id',
    method: 'PATCH',
    description: 'Update category',
  },
  {
    module: 'Category',
    api: '/categories/:id',
    method: 'DELETE',
    description: 'Delete category',
  },

  // Enrollment Module
  {
    module: 'Enrollment',
    api: '/enrollments',
    method: 'GET',
    description: 'List all enrollments',
  },
  {
    module: 'Enrollment',
    api: '/enrollments/:id',
    method: 'GET',
    description: 'Get enrollment by ID',
  },
  {
    module: 'Enrollment',
    api: '/enrollments',
    method: 'POST',
    description: 'Create enrollment',
  },
  {
    module: 'Enrollment',
    api: '/enrollments/:id',
    method: 'PUT',
    description: 'Update enrollment',
  },
  {
    module: 'Enrollment',
    api: '/enrollments/:id',
    method: 'DELETE',
    description: 'Delete enrollment',
  },
  {
    module: 'Enrollment',
    api: '/enrollments/user/:userId/course',
    method: 'GET',
    description: 'Get course by user with progress',
  },
  {
    module: 'Enrollment',
    api: '/enrollments/user/:userId/courses',
    method: 'GET',
    description: 'Get courses by user with progress (paginated)',
  },
  {
    module: 'Enrollment',
    api: '/enrollments/user/:userId/course/:courseId/progress',
    method: 'GET',
    description: 'Get enrollment with progress',
  },
  {
    module: 'Enrollment',
    api: '/enrollments/:enrollmentId/lectures/:lectureId/complete',
    method: 'POST',
    description: 'Mark lecture as completed',
  },
  {
    module: 'Enrollment',
    api: '/enrollments/:enrollmentId/lectures/:lectureId/watch-time',
    method: 'PATCH',
    description: 'Update lecture watch time',
  },

  // Order Module
  {
    module: 'Order',
    api: '/orders',
    method: 'GET',
    description: 'List all orders',
  },
  {
    module: 'Order',
    api: '/orders/:id',
    method: 'GET',
    description: 'Get order by ID',
  },
  {
    module: 'Order',
    api: '/orders',
    method: 'POST',
    description: 'Create new order',
  },
  {
    module: 'Order',
    api: '/orders/:id',
    method: 'PUT',
    description: 'Update order',
  },
  {
    module: 'Order',
    api: '/orders/:id',
    method: 'DELETE',
    description: 'Delete order',
  },
  {
    module: 'Order',
    api: '/orders/vnpay-return',
    method: 'GET',
    description: 'VNPay payment return callback',
  },
  {
    module: 'Order',
    api: '/orders/vnpay-cancel',
    method: 'GET',
    description: 'VNPay payment cancel callback',
  },
  {
    module: 'Order',
    api: '/orders/user',
    method: 'GET',
    description: 'Get user orders',
  },
  {
    module: 'Order',
    api: '/orders/info/:id',
    method: 'GET',
    description: 'Get order info',
  },
  {
    module: 'Order',
    api: '/orders/callback/:method',
    method: 'POST',
    description: 'Payment callback handler',
  },
  {
    module: 'Order',
    api: '/orders/admin/retry-failed-enrollments',
    method: 'POST',
    description: 'Retry failed enrollments',
  },
  {
    module: 'Order',
    api: '/orders/admin/validate/:id',
    method: 'GET',
    description: 'Validate order integrity',
  },

  // Review Module
  {
    module: 'Review',
    api: '/reviews',
    method: 'GET',
    description: 'List all reviews',
  },
  {
    module: 'Review',
    api: '/reviews/distribution',
    method: 'GET',
    description: 'Get review distribution',
  },
  {
    module: 'Review',
    api: '/reviews/course/:courseId',
    method: 'GET',
    description: 'Get course reviews',
  },
  {
    module: 'Review',
    api: '/reviews/user/:userId/course/:courseId',
    method: 'GET',
    description: 'Get user course review',
  },
  {
    module: 'Review',
    api: '/reviews/:id',
    method: 'GET',
    description: 'Get review by ID',
  },
  {
    module: 'Review',
    api: '/reviews',
    method: 'POST',
    description: 'Create review',
  },
  {
    module: 'Review',
    api: '/reviews/:id',
    method: 'PATCH',
    description: 'Update review',
  },
  {
    module: 'Review',
    api: '/reviews/:id',
    method: 'DELETE',
    description: 'Delete review',
  },
  {
    module: 'Review',
    api: '/reviews/:id/vote/up',
    method: 'POST',
    description: 'Vote up on review',
  },
  {
    module: 'Review',
    api: '/reviews/:id/vote/down',
    method: 'POST',
    description: 'Vote down on review',
  },
  {
    module: 'Review',
    api: '/reviews/:id/vote/user',
    method: 'GET',
    description: 'Get user vote on review',
  },

  // Cart Module
  {
    module: 'Cart',
    api: '/cart',
    method: 'GET',
    description: 'Get user cart',
  },
  {
    module: 'Cart',
    api: '/cart/:courseId',
    method: 'POST',
    description: 'Add item to cart',
  },
  {
    module: 'Cart',
    api: '/cart/:courseId',
    method: 'DELETE',
    description: 'Remove item from cart',
  },
  {
    module: 'Cart',
    api: '/cart',
    method: 'DELETE',
    description: 'Clear cart',
  },

  // Support Ticket Module
  {
    module: 'SupportTicket',
    api: '/support-tickets',
    method: 'GET',
    description: 'List support tickets',
  },
  {
    module: 'SupportTicket',
    api: '/support-tickets/admin/all',
    method: 'GET',
    description: 'Get all tickets for admin',
  },
  {
    module: 'SupportTicket',
    api: '/support-tickets/unread-count',
    method: 'GET',
    description: 'Get unread ticket count',
  },
  {
    module: 'SupportTicket',
    api: '/support-tickets/:id',
    method: 'GET',
    description: 'Get support ticket by ID',
  },
  {
    module: 'SupportTicket',
    api: '/support-tickets',
    method: 'POST',
    description: 'Create support ticket',
  },
  {
    module: 'SupportTicket',
    api: '/support-tickets/:id',
    method: 'PUT',
    description: 'Update support ticket',
  },
  {
    module: 'SupportTicket',
    api: '/support-tickets/:id/status',
    method: 'PATCH',
    description: 'Update ticket status',
  },
  {
    module: 'SupportTicket',
    api: '/support-tickets/:id/read',
    method: 'PATCH',
    description: 'Mark messages as read',
  },
  {
    module: 'SupportTicket',
    api: '/support-tickets/:id',
    method: 'DELETE',
    description: 'Delete support ticket',
  },
  {
    module: 'SupportTicket',
    api: '/support-tickets/:id/messages',
    method: 'GET',
    description: 'Get ticket messages',
  },
  {
    module: 'SupportTicket',
    api: '/support-tickets/:id/messages',
    method: 'POST',
    description: 'Send ticket message',
  },

  // Gemini AI Module
  {
    module: 'Gemini',
    api: '/gemini/chat',
    method: 'POST',
    description: 'Chat with Gemini AI',
  },

  // Certification Module
  {
    module: 'Certification',
    api: '/certifications',
    method: 'GET',
    description: 'List user certifications',
  },
  {
    module: 'Certification',
    api: '/certifications/user/:userId',
    method: 'GET',
    description: 'Get user certifications',
  },
  {
    module: 'Certification',
    api: '/certifications/course/:courseId',
    method: 'GET',
    description: 'Get course certifications',
  },
  {
    module: 'Certification',
    api: '/certifications/verify/:id',
    method: 'GET',
    description: 'Verify certification',
  },
  {
    module: 'Certification',
    api: '/certifications/:id',
    method: 'GET',
    description: 'Get certification by ID',
  },
  {
    module: 'Certification',
    api: '/certifications',
    method: 'POST',
    description: 'Generate certification',
  },
];

@Injectable()
export class AutoPermissionService implements OnModuleInit {
  private readonly logger = new Logger(AutoPermissionService.name);

  constructor(private readonly permissionService: PermissionService) {}

  async onModuleInit() {
    // Check if auto-seeding is enabled
    const isAutoSeedEnabled =
      process.env.AUTO_SEED_PERMISSIONS === 'true' ||
      process.env.NODE_ENV !== 'production';

    if (!isAutoSeedEnabled) {
      this.logger.debug('Auto-seeding permissions disabled');
      return;
    }

    this.logger.log('🌱 Auto-seeding permissions...');
    await this.seedPermissions();
  }

  private async seedPermissions() {
    let createdCount = 0;
    let skippedCount = 0;

    for (const permissionData of PERMISSIONS_DATA) {
      try {
        await this.permissionService.create(permissionData);
        this.logger.log(
          `✅ Created: ${permissionData.module} - ${permissionData.api} (${permissionData.method})`,
        );
        createdCount++;
      } catch (error) {
        if (error.message.includes('already exists')) {
          // this.logger.debug(`⏭️  Skipped: ${permissionData.module} - ${permissionData.api} (${permissionData.method})`);
          skippedCount++;
        } else {
          this.logger.error(
            `❌ Error creating permission ${permissionData.api}:`,
            error.message,
          );
        }
      }
    }

    this.logger.log(
      `🎉 Permission auto-seeding completed! Created: ${createdCount}, Skipped: ${skippedCount}`,
    );
  }
}
   