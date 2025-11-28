import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Role } from 'src/entities/role.entity';
import { Permission } from 'src/entities/permission.entity';
import { PermissionService } from 'src/modules/permission/permission.service';

/**
 * Comprehensive Permission Seeder Service
 *
 * This service handles three tasks in order:
 * 1. Creates all API permissions in the database
 * 2. Creates default roles (admin, instructor, student)
 * 3. Assigns appropriate permissions to each role
 *
 * Role Hierarchy:
 * - Student: Basic access to courses, enrollments, and personal resources
 * - Instructor: Student permissions + course/content creation and management
 * - Admin: All permissions
 */

// ============================================================================
// PERMISSION DEFINITIONS
// ============================================================================
const PERMISSIONS_DATA = [
  // Auth Module - Public authentication endpoints
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
    description: 'List all users (Admin/Instructor)',
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
    description: 'Create new user (Admin only)',
  },
  {
    module: 'User',
    api: '/users/admin',
    method: 'POST',
    description: 'Create user by admin (Admin only)',
  },
  {
    module: 'User',
    api: '/users/:id',
    method: 'PATCH',
    description: 'Update user (own profile or admin)',
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
    description: 'Soft delete user (Admin only)',
  },
  {
    module: 'User',
    api: '/users/:id/restore',
    method: 'PATCH',
    description: 'Restore soft-deleted user (Admin only)',
  },
  {
    module: 'User',
    api: '/users/:id/force',
    method: 'DELETE',
    description: 'Permanently delete user (Admin only)',
  },
  {
    module: 'User',
    api: '/users/:id/avatar',
    method: 'POST',
    description: 'Upload user avatar',
  },

  // Role Module - Admin only
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

  // Permission Module - Admin only
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
    description: 'List all courses (Public)',
  },
  {
    module: 'Course',
    api: '/courses/by-category',
    method: 'GET',
    description: 'Get courses by category (Public)',
  },
  {
    module: 'Course',
    api: '/courses/:id',
    method: 'GET',
    description: 'Get course by ID (Public)',
  },
  {
    module: 'Course',
    api: '/courses',
    method: 'POST',
    description: 'Create new course (Instructor)',
  },
  {
    module: 'Course',
    api: '/courses/:id',
    method: 'PATCH',
    description: 'Update course (Instructor - own courses)',
  },
  {
    module: 'Course',
    api: '/courses/:id',
    method: 'DELETE',
    description: 'Soft delete course (Instructor - own courses)',
  },
  {
    module: 'Course',
    api: '/courses/:id/restore',
    method: 'PATCH',
    description: 'Restore soft-deleted course (Admin)',
  },
  {
    module: 'Course',
    api: '/courses/:id/force',
    method: 'DELETE',
    description: 'Permanently delete course (Admin)',
  },
  {
    module: 'Course',
    api: '/courses/:id/thumbnail',
    method: 'POST',
    description: 'Upload course thumbnail (Instructor)',
  },
  {
    module: 'Course',
    api: '/courses/:id/students',
    method: 'GET',
    description: 'Get course students with progress (Instructor)',
  },

  // Course Content Module
  {
    module: 'CourseContent',
    api: '/course-content/:courseId/content',
    method: 'GET',
    description: 'Get course content (Public)',
  },
  {
    module: 'CourseContent',
    api: '/course-content/course/:courseId/batch-content',
    method: 'POST',
    description: 'Batch save course content (Instructor)',
  },
  {
    module: 'CourseContent',
    api: '/course-content/course/:courseId/structure',
    method: 'GET',
    description: 'Get course structure (Public)',
  },
  {
    module: 'CourseContent',
    api: '/course-content/sections/:sectionId',
    method: 'DELETE',
    description: 'Delete course section (Instructor)',
  },
  {
    module: 'CourseContent',
    api: '/course-content/lectures/:lectureId',
    method: 'DELETE',
    description: 'Delete lecture (Instructor)',
  },
  {
    module: 'CourseContent',
    api: '/course-content/lectures/:lectureId',
    method: 'GET',
    description: 'Get lecture details (Public)',
  },
  {
    module: 'CourseContent',
    api: '/course-content/:courseId/lecture',
    method: 'POST',
    description: 'Upload course lecture (Instructor)',
  },
  {
    module: 'CourseContent',
    api: '/course-content/lecture/:lectureId/captions',
    method: 'GET',
    description: 'Get lecture captions (Public)',
  },
  {
    module: 'CourseContent',
    api: '/course-content/progress/:enrollmentId/lectures/:lectureId',
    method: 'POST',
    description: 'Update lecture progress (Student)',
  },
  {
    module: 'CourseContent',
    api: '/course-content/progress/:enrollmentId/course/:courseId',
    method: 'GET',
    description: 'Get course progress (Student)',
  },
  {
    module: 'CourseContent',
    api: '/course-content/quiz/submit',
    method: 'POST',
    description: 'Submit quiz answers (Student)',
  },

  // Category Module
  {
    module: 'Category',
    api: '/categories',
    method: 'GET',
    description: 'List all categories (Public)',
  },
  {
    module: 'Category',
    api: '/categories/:id',
    method: 'GET',
    description: 'Get category by ID (Public)',
  },
  {
    module: 'Category',
    api: '/categories',
    method: 'POST',
    description: 'Create new category (Admin)',
  },
  {
    module: 'Category',
    api: '/categories/:id',
    method: 'PATCH',
    description: 'Update category (Admin)',
  },
  {
    module: 'Category',
    api: '/categories/:id',
    method: 'DELETE',
    description: 'Delete category (Admin)',
  },

  // Enrollment Module
  {
    module: 'Enrollment',
    api: '/enrollments',
    method: 'GET',
    description: 'List all enrollments (Admin/Instructor)',
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
    description: 'List all orders (Admin)',
  },
  {
    module: 'Order',
    api: '/orders/:id',
    method: 'GET',
    description: 'Get order by ID (own orders)',
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
    description: 'Delete order (Admin)',
  },
  {
    module: 'Order',
    api: '/orders/vnpay-return',
    method: 'GET',
    description: 'VNPay payment return callback (Public)',
  },
  {
    module: 'Order',
    api: '/orders/vnpay-cancel',
    method: 'GET',
    description: 'VNPay payment cancel callback (Public)',
  },
  {
    module: 'Order',
    api: '/orders/user',
    method: 'GET',
    description: 'Get user orders (own orders)',
  },
  {
    module: 'Order',
    api: '/orders/info/:id',
    method: 'GET',
    description: 'Get order info (Public)',
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
    description: 'Retry failed enrollments (Admin)',
  },
  {
    module: 'Order',
    api: '/orders/admin/validate/:id',
    method: 'GET',
    description: 'Validate order integrity (Admin)',
  },

  // Review Module
  {
    module: 'Review',
    api: '/reviews',
    method: 'GET',
    description: 'List all reviews (Public)',
  },
  {
    module: 'Review',
    api: '/reviews/distribution',
    method: 'GET',
    description: 'Get review distribution (Public)',
  },
  {
    module: 'Review',
    api: '/reviews/course/:courseId',
    method: 'GET',
    description: 'Get course reviews (Public)',
  },
  {
    module: 'Review',
    api: '/reviews/user/:userId/course/:courseId',
    method: 'GET',
    description: 'Get user course review (Public)',
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
    description: 'Create review (Student)',
  },
  {
    module: 'Review',
    api: '/reviews/:id',
    method: 'PATCH',
    description: 'Update review (own review)',
  },
  {
    module: 'Review',
    api: '/reviews/:id',
    method: 'DELETE',
    description: 'Delete review (own review or admin)',
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

  // Cart Module - Students only
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
    description: 'List support tickets (own tickets)',
  },
  {
    module: 'SupportTicket',
    api: '/support-tickets/admin/all',
    method: 'GET',
    description: 'Get all tickets for admin (Admin)',
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

  // Gemini AI Module - All authenticated users
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
    description: 'Verify certification (Public)',
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

// ============================================================================
// ROLE-PERMISSION ASSIGNMENTS
// ============================================================================

/**
 * Permission assignment strategy:
 *
 * STUDENT ROLE:
 * - Authentication and profile management
 * - Course browsing and enrollment
 * - Learning activities (watching lectures, taking quizzes, tracking progress)
 * - Reviews and ratings
 * - Shopping cart and orders
 * - Support tickets
 * - AI chat assistance
 * - Certifications
 *
 * INSTRUCTOR ROLE:
 * - All student permissions
 * - Course creation and management
 * - Course content creation and management
 * - View enrolled students and their progress
 * - View user information
 * - View all enrollments
 *
 * ADMIN ROLE:
 * - All permissions (full system access)
 */

@Injectable()
export class PermissionSeederService implements OnModuleInit {
  private readonly logger = new Logger(PermissionSeederService.name);

  constructor(
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
    @InjectRepository(Permission)
    private readonly permissionRepository: Repository<Permission>,
    private readonly permissionService: PermissionService,
  ) {}

  async onModuleInit() {
    const isAutoSeedEnabled =
      process.env.AUTO_SEED_PERMISSIONS === 'true' ||
      process.env.NODE_ENV !== 'production';

    if (!isAutoSeedEnabled) {
      this.logger.debug('Auto-seeding permissions disabled');
      return;
    }

    this.logger.log('🌱 Starting comprehensive permission seeding...');

    // Step 1: Seed all permissions
    await this.seedPermissions();

    // Step 2: Wait a moment for permissions to be fully committed
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Step 3: Assign permissions to roles
    await this.assignPermissionsToRoles();

    this.logger.log('🎉 Permission seeding completed!');
  }

  // ==========================================================================
  // STEP 1: SEED PERMISSIONS
  // ==========================================================================
  private async seedPermissions(): Promise<void> {
    this.logger.log('📝 Seeding permissions...');
    let createdCount = 0;
    let skippedCount = 0;

    for (const permissionData of PERMISSIONS_DATA) {
      try {
        await this.permissionService.create(permissionData);
        this.logger.debug(
          `✅ Created: ${permissionData.module} - ${permissionData.api} (${permissionData.method})`,
        );
        createdCount++;
      } catch (error) {
        if (error.message.includes('already exists')) {
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
      `✅ Permissions: Created ${createdCount}, Skipped ${skippedCount}`,
    );
  }

  // ==========================================================================
  // STEP 2: ASSIGN PERMISSIONS TO ROLES
  // ==========================================================================
  private async assignPermissionsToRoles(): Promise<void> {
    this.logger.log('🔗 Assigning permissions to roles...');

    try {
      // Fetch all roles
      const studentRole = await this.roleRepository.findOne({
        where: { name: 'student' },
        relations: ['permissions'],
      });
      const instructorRole = await this.roleRepository.findOne({
        where: { name: 'instructor' },
        relations: ['permissions'],
      });
      const adminRole = await this.roleRepository.findOne({
        where: { name: 'admin' },
        relations: ['permissions'],
      });

      if (!studentRole || !instructorRole || !adminRole) {
        this.logger.warn(
          '⚠️  One or more roles not found. Make sure roles are seeded first.',
        );
        return;
      }

      // Fetch all permissions
      const allPermissions = await this.permissionRepository.find();

      if (allPermissions.length === 0) {
        this.logger.warn('⚠️  No permissions found in database.');
        return;
      }

      // Define permission sets for each role
      const studentPermissions = this.getStudentPermissions(allPermissions);
      const instructorPermissions =
        this.getInstructorPermissions(allPermissions);
      const adminPermissions = allPermissions; // Admin gets all permissions

      // Assign permissions to roles
      await this.assignToRole(studentRole, 'student', studentPermissions);
      await this.assignToRole(
        instructorRole,
        'instructor',
        instructorPermissions,
      );
      await this.assignToRole(adminRole, 'admin', adminPermissions);

      this.logger.log('✅ Role-permission assignment completed!');
    } catch (error) {
      this.logger.error(
        '❌ Error assigning permissions to roles:',
        error.message,
      );
    }
  }

  // ==========================================================================
  // STUDENT PERMISSIONS
  // ==========================================================================
  private getStudentPermissions(allPermissions: Permission[]): Permission[] {
    return allPermissions.filter((p) => {
      // Auth - All authentication operations
      if (p.module === 'Auth') return true;

      // User - Profile management
      if (p.module === 'User') {
        return (
          p.api === '/users/me' || // View own profile
          p.api === '/users/:id/avatar' || // Upload own avatar
          (p.api === '/users/:id' && p.method === 'PATCH') || // Update own profile
          (p.api === '/users/password/:id' && p.method === 'PATCH') // Change own password
        );
      }

      // Course - View courses (read-only)
      if (p.module === 'Course' && p.method === 'GET') return true;

      // Category - View categories (read-only)
      if (p.module === 'Category' && p.method === 'GET') return true;

      // CourseContent - View content and track progress
      if (p.module === 'CourseContent') {
        return (
          p.method === 'GET' || // View all content
          p.api.includes('progress') || // Track progress
          p.api.includes('quiz') // Submit quizzes
        );
      }

      // Enrollment - All enrollment operations
      if (p.module === 'Enrollment') return true;

      // Review - All review operations (create, read, update, delete own, vote)
      if (p.module === 'Review') return true;

      // Cart - All cart operations
      if (p.module === 'Cart') return true;

      // Order - Create and view own orders (exclude admin endpoints)
      if (p.module === 'Order') {
        return (
          !p.api.includes('admin') && // Exclude admin-only endpoints
          (p.method === 'GET' || // View orders
            p.method === 'POST' || // Create orders
            p.method === 'PUT') // Update orders (e.g., status)
        );
      }

      // SupportTicket - All ticket operations for own tickets
      if (p.module === 'SupportTicket') {
        return !p.api.includes('admin'); // Exclude admin-only endpoints
      }

      // Certification - View and generate own certifications
      if (p.module === 'Certification') return true;

      // Gemini - AI chat assistance
      if (p.module === 'Gemini') return true;

      return false;
    });
  }

  // ==========================================================================
  // INSTRUCTOR PERMISSIONS
  // ==========================================================================
  private getInstructorPermissions(
    allPermissions: Permission[],
  ): Permission[] {
    const studentPermissions = this.getStudentPermissions(allPermissions);

    return allPermissions.filter((p) => {
      // Include all student permissions
      if (studentPermissions.includes(p)) return true;

      // User - View user details (to see student information)
      if (p.module === 'User' && p.method === 'GET') return true;

      // Course - Create, update, delete courses
      if (p.module === 'Course') {
        return ['POST', 'PATCH', 'DELETE'].includes(p.method);
      }

      // CourseContent - Create, update, delete course content
      if (p.module === 'CourseContent') {
        return ['POST', 'PATCH', 'DELETE'].includes(p.method);
      }

      // Enrollment - View all enrollments (to see students in their courses)
      if (p.module === 'Enrollment' && p.api === '/enrollments' && p.method === 'GET') {
        return true;
      }

      return false;
    });
  }

  // ==========================================================================
  // HELPER: ASSIGN PERMISSIONS TO ROLE
  // ==========================================================================
  private async assignToRole(
    role: Role,
    roleName: string,
    targetPermissions: Permission[],
  ): Promise<void> {
    try {
      if (!role.permissions || role.permissions.length === 0) {
        // No permissions assigned yet - assign all
        role.permissions = targetPermissions;
        await this.roleRepository.save(role);
        this.logger.log(
          `✅ Assigned ${targetPermissions.length} permissions to ${roleName} role`,
        );
      } else {
        // Some permissions already assigned - add missing ones
        const existingPermissionIds = new Set(
          role.permissions.map((p) => p.id),
        );
        const missingPermissions = targetPermissions.filter(
          (p) => !existingPermissionIds.has(p.id),
        );

        if (missingPermissions.length > 0) {
          role.permissions = [...role.permissions, ...missingPermissions];
          await this.roleRepository.save(role);
          this.logger.log(
            `✅ Added ${missingPermissions.length} new permissions to ${roleName} role (Total: ${role.permissions.length})`,
          );
        } else {
          this.logger.log(
            `⏭️  ${roleName} role already has all ${role.permissions.length} permissions`,
          );
        }
      }
    } catch (error) {
      if (error.message?.includes('duplicate key')) {
        this.logger.debug(
          `⏭️  ${roleName} role permissions already assigned (duplicate detected)`,
        );
      } else {
        throw error;
      }
    }
  }
}
