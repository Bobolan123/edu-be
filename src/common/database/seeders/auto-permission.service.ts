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
    api: '/auth/refresh',
    method: 'POST',
    description: 'Refresh JWT token',
  },
  {
    module: 'Auth',
    api: '/auth/logout',
    method: 'POST',
    description: 'User logout',
  },

  // User Module
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
    api: '/users/:id',
    method: 'PUT',
    description: 'Update user',
  },
  {
    module: 'User',
    api: '/users/:id',
    method: 'DELETE',
    description: 'Delete user',
  },
  {
    module: 'User',
    api: '/users/profile',
    method: 'GET',
    description: 'Get user profile',
  },
  {
    module: 'User',
    api: '/users/profile',
    method: 'PUT',
    description: 'Update user profile',
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
    method: 'PUT',
    description: 'Update course',
  },
  {
    module: 'Course',
    api: '/courses/:id',
    method: 'DELETE',
    description: 'Delete course',
  },
  {
    module: 'Course',
    api: '/courses/:id/publish',
    method: 'PUT',
    description: 'Publish course',
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
    method: 'PUT',
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

  // Review Module
  {
    module: 'Review',
    api: '/reviews',
    method: 'GET',
    description: 'List all reviews',
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
    method: 'PUT',
    description: 'Update review',
  },
  {
    module: 'Review',
    api: '/reviews/:id',
    method: 'DELETE',
    description: 'Delete review',
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
    api: '/cart',
    method: 'POST',
    description: 'Add item to cart',
  },
  {
    module: 'Cart',
    api: '/cart/:id',
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

  // Course Content Module
  {
    module: 'CourseContent',
    api: '/courses/:courseId/sections',
    method: 'GET',
    description: 'Get course sections',
  },
  {
    module: 'CourseContent',
    api: '/courses/:courseId/sections',
    method: 'POST',
    description: 'Create course section',
  },
  {
    module: 'CourseContent',
    api: '/courses/:courseId/sections/:id',
    method: 'PUT',
    description: 'Update course section',
  },
  {
    module: 'CourseContent',
    api: '/courses/:courseId/sections/:id',
    method: 'DELETE',
    description: 'Delete course section',
  },
  {
    module: 'CourseContent',
    api: '/sections/:sectionId/lectures',
    method: 'GET',
    description: 'Get section lectures',
  },
  {
    module: 'CourseContent',
    api: '/sections/:sectionId/lectures',
    method: 'POST',
    description: 'Create lecture',
  },
  {
    module: 'CourseContent',
    api: '/sections/:sectionId/lectures/:id',
    method: 'PUT',
    description: 'Update lecture',
  },
  {
    module: 'CourseContent',
    api: '/sections/:sectionId/lectures/:id',
    method: 'DELETE',
    description: 'Delete lecture',
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

  // Subscription Module
  {
    module: 'Subscription',
    api: '/subscriptions',
    method: 'GET',
    description: 'List subscriptions',
  },
  {
    module: 'Subscription',
    api: '/subscriptions/:id',
    method: 'GET',
    description: 'Get subscription by ID',
  },
  {
    module: 'Subscription',
    api: '/subscriptions',
    method: 'POST',
    description: 'Create subscription',
  },
  {
    module: 'Subscription',
    api: '/subscriptions/:id',
    method: 'PUT',
    description: 'Update subscription',
  },
  {
    module: 'Subscription',
    api: '/subscriptions/:id',
    method: 'DELETE',
    description: 'Cancel subscription',
  },

  // Gemini AI Module
  {
    module: 'Gemini',
    api: '/gemini/analyze',
    method: 'POST',
    description: 'Analyze content with AI',
  },

  // Role & Permission Module
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
    method: 'PUT',
    description: 'Update role',
  },
  {
    module: 'Role',
    api: '/roles/:id',
    method: 'DELETE',
    description: 'Delete role',
  },

  {
    module: 'Permission',
    api: '/permissions',
    method: 'GET',
    description: 'List all permissions',
  },
  {
    module: 'Permission',
    api: '/permissions/:id',
    method: 'GET',
    description: 'Get permission by ID',
  },
  {
    module: 'Permission',
    api: '/permissions',
    method: 'POST',
    description: 'Create new permission',
  },
  {
    module: 'Permission',
    api: '/permissions/:id',
    method: 'PUT',
    description: 'Update permission',
  },
  {
    module: 'Permission',
    api: '/permissions/:id',
    method: 'DELETE',
    description: 'Delete permission',
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
