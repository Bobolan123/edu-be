import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';

import { User } from 'src/entities/user.entity';
import { Role } from 'src/entities/role.entity';
import { Permission } from 'src/entities/permission.entity';
import { Category } from 'src/entities/category.entity';
import { Course } from 'src/entities/course.entity';
import { CourseSection } from 'src/entities/course-section.entity';
import { CourseLecture } from 'src/entities/course-lecture.entity';
import { Enrollment } from 'src/entities/enrollment.entity';
import { Review } from 'src/entities/review.entity';
import { ReviewVote } from 'src/entities/review-vote.entity';
import { Order, OrderStatus, PaymentMethod } from 'src/entities/order.entity';
import { OrderCourse } from 'src/entities/order-course.entity';
import { SupportTicket, TicketStatus } from 'src/entities/support-ticket.entity';
import { Cart } from 'src/entities/cart.entity';
import { CartItem } from 'src/entities/cartItem.entity';
import {
  TicketMessage,
  TicketMessageDocument,
} from 'src/schemas/ticket-message.schema';

@Injectable()
export class SeedAllService {
  private readonly logger = new Logger(SeedAllService.name);

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Role)
    private roleRepository: Repository<Role>,
    @InjectRepository(Permission)
    private permissionRepository: Repository<Permission>,
    @InjectRepository(Category)
    private categoryRepository: Repository<Category>,
    @InjectRepository(Course)
    private courseRepository: Repository<Course>,
    @InjectRepository(CourseSection)
    private sectionRepository: Repository<CourseSection>,
    @InjectRepository(CourseLecture)
    private lectureRepository: Repository<CourseLecture>,
    @InjectRepository(Enrollment)
    private enrollmentRepository: Repository<Enrollment>,
    @InjectRepository(Review)
    private reviewRepository: Repository<Review>,
    @InjectRepository(ReviewVote)
    private reviewVoteRepository: Repository<ReviewVote>,
    @InjectRepository(Order)
    private orderRepository: Repository<Order>,
    @InjectRepository(OrderCourse)
    private orderCourseRepository: Repository<OrderCourse>,
    @InjectRepository(SupportTicket)
    private ticketRepository: Repository<SupportTicket>,
    @InjectRepository(Cart)
    private cartRepository: Repository<Cart>,
    @InjectRepository(CartItem)
    private cartItemRepository: Repository<CartItem>,
    @InjectModel(TicketMessage.name)
    private messageModel: Model<TicketMessageDocument>,
    private configService: ConfigService,
  ) {}

  async seedAll() {
    this.logger.log('🌱 Starting comprehensive database seeding...');

    await this.clearDatabase();

    const roles = await this.seedRoles();
    const { students, instructors, admin } = await this.seedUsers(roles);
    const categories = await this.seedCategories();
    const courses = await this.seedCourses(instructors, categories);
    const sections = await this.seedSections(courses);
    const lectures = await this.seedLectures(sections);
    const enrollments = await this.seedEnrollments(students, courses);
    const reviews = await this.seedReviews(students, courses);
    const orders = await this.seedOrders(students, courses);
    const carts = await this.seedCarts(students, courses);
    const tickets = await this.seedSupportTickets(
      students,
      instructors,
      courses,
    );
    await this.seedTicketMessages(tickets);

    this.logger.log('✅ Database seeding completed successfully!');
    return {
      roles: roles.length,
      users: students.length + instructors.length + 1,
      categories: categories.length,
      courses: courses.length,
      sections: sections.length,
      lectures: lectures.length,
      enrollments: enrollments.length,
      reviews: reviews.length,
      orders: orders.length,
      carts: carts.length,
      tickets: tickets.length,
    };
  }

  private async clearDatabase() {
    this.logger.log('🧹 Clearing existing data...');
    try {
      await this.messageModel.deleteMany({});
      await this.ticketRepository.delete({});
      await this.cartItemRepository.delete({});
      await this.cartRepository.delete({});
      await this.reviewVoteRepository.delete({});
      await this.orderCourseRepository.delete({});
      await this.orderRepository.delete({});
      await this.reviewRepository.delete({});
      await this.enrollmentRepository.delete({});
      await this.lectureRepository.delete({});
      await this.sectionRepository.delete({});
      await this.courseRepository.delete({});
      await this.categoryRepository.delete({});
      this.logger.log('✨ Database cleared.');
    } catch (error) {
      this.logger.error('Error clearing database:', error.message);
    }
  }

  private async seedRoles(): Promise<Role[]> {
    this.logger.log('👥 Seeding roles...');

    const rolesData = [
      {
        name: 'admin',
        description: 'Administrator with full access',
        isActive: true,
      },
      {
        name: 'instructor',
        description: 'Instructor who can create and manage courses',
        isActive: true,
      },
      {
        name: 'student',
        description: 'Student who can enroll in courses',
        isActive: true,
      },
    ];

    const roles = [];
    for (const roleData of rolesData) {
      const existingRole = await this.roleRepository.findOne({
        where: { name: roleData.name },
      });

      if (existingRole) {
        roles.push(existingRole);
        this.logger.log(`  ⏭️  Role "${roleData.name}" already exists`);
      } else {
        const role = await this.roleRepository.save(
          this.roleRepository.create(roleData),
        );
        roles.push(role);
        this.logger.log(`  ✅ Created role: ${roleData.name}`);
      }
    }

    return roles;
  }

  private async seedUsers(
    roles: Role[],
  ): Promise<{ students: User[]; instructors: User[]; admin: User }> {
    this.logger.log('👤 Seeding users...');

    const adminRole = roles.find((r) => r.name === 'admin');
    const instructorRole = roles.find((r) => r.name === 'instructor');
    const studentRole = roles.find((r) => r.name === 'student');

    // Create main users from environment variables
    const adminPassword = await bcrypt.hash(
      this.configService.get('ADMIN_PASSWORD') || 'admin',
      12,
    );
    const admin = await this.createUserIfNotExists({
      name: this.configService.get('ADMIN_NAME') || 'Admin',
      email: this.configService.get('ADMIN_EMAIL') || 'admin@gmail.com',
      password: adminPassword,
      isActive: true,
      role: adminRole,
      bio: 'System administrator',
    });

    const teacherPassword = await bcrypt.hash(
      this.configService.get('TEACHER_PASSWORD') || 'instructor',
      12,
    );
    const mainInstructor = await this.createUserIfNotExists({
      name: this.configService.get('TEACHER_NAME') || 'Instructor',
      email: this.configService.get('TEACHER_EMAIL') || 'instructor@gmail.com',
      password: teacherPassword,
      isActive: true,
      role: instructorRole,
      bio: 'Main instructor account',
      avatar_url: 'https://i.pravatar.cc/150?img=12',
    });

    const studentPassword = await bcrypt.hash(
      this.configService.get('STUDENT_PASSWORD') || 'student',
      12,
    );
    const mainStudent = await this.createUserIfNotExists({
      name: this.configService.get('STUDENT_NAME') || 'Student',
      email: this.configService.get('STUDENT_EMAIL') || 'student@gmail.com',
      password: studentPassword,
      isActive: true,
      role: studentRole,
      bio: 'Main student account',
      avatar_url: 'https://i.pravatar.cc/150?img=20',
    });

    // Additional test data users
    const testPassword = await bcrypt.hash('123', 12);

    const instructorsData = [
      {
        name: 'Jane Smith',
        email: 'jane.instructor@gmail.com',
        password: testPassword,
        isActive: true,
        role: instructorRole,
        bio: 'Full-stack developer and tech educator',
        avatar_url: 'https://i.pravatar.cc/150?img=47',
      },
      {
        name: 'Michael Johnson',
        email: 'michael.instructor@gmail.com',
        password: testPassword,
        isActive: true,
        role: instructorRole,
        bio: 'Data science expert and machine learning enthusiast',
        avatar_url: 'https://i.pravatar.cc/150?img=33',
      },
    ];

    const instructors: User[] = [mainInstructor];
    for (const data of instructorsData) {
      const instructor = await this.createUserIfNotExists(data);
      instructors.push(instructor);
    }

    const studentsData = [
      {
        name: 'Alice Brown',
        email: 'alice.student@gmail.com',
        password: testPassword,
        isActive: true,
        role: studentRole,
        bio: 'Aspiring web developer',
        avatar_url: 'https://i.pravatar.cc/150?img=21',
      },
      {
        name: 'Bob Wilson',
        email: 'bob.student@gmail.com',
        password: testPassword,
        isActive: true,
        role: studentRole,
        bio: 'Computer science student',
        avatar_url: 'https://i.pravatar.cc/150?img=15',
      },
      {
        name: 'Carol Davis',
        email: 'carol.student@gmail.com',
        password: testPassword,
        isActive: true,
        role: studentRole,
        bio: 'Career changer learning programming',
        avatar_url: 'https://i.pravatar.cc/150?img=45',
      },
      {
        name: 'David Lee',
        email: 'david.student@gmail.com',
        password: testPassword,
        isActive: true,
        role: studentRole,
        bio: 'Tech enthusiast and lifelong learner',
        avatar_url: 'https://i.pravatar.cc/150?img=51',
      },
    ];

    const students: User[] = [mainStudent];
    for (const data of studentsData) {
      const student = await this.createUserIfNotExists(data);
      students.push(student);
    }

    this.logger.log(
      `  ✅ Seeded ${students.length + instructors.length + 1} users`,
    );
    return { students, instructors, admin };
  }

  private async createUserIfNotExists(userData: any): Promise<User> {
    const existing = await this.userRepository.findOne({
      where: { email: userData.email },
      withDeleted: false,
    });

    if (existing) {
      this.logger.log(`  ⏭️  User "${userData.email}" already exists`);
      return existing;
    }

    const newUser = this.userRepository.create(userData);
    await this.userRepository.save(newUser);
    this.logger.log(`  ✅ Created user: ${userData.email}`);

    // Fetch and return the saved user to ensure proper typing
    const savedUser = await this.userRepository.findOne({
      where: { email: userData.email },
    });
    return savedUser!;
  }

  private async seedCategories(): Promise<Category[]> {
    this.logger.log('📚 Seeding categories...');
    const categoriesData = [
      {
        name: 'Web Development',
        description: 'Learn to build websites and web applications',
      },
      {
        name: 'Mobile Development',
        description: 'Create mobile apps for iOS and Android',
      },
      {
        name: 'Data Science',
        description: 'Analyze data and build predictive models',
      },
      {
        name: 'Machine Learning',
        description: 'AI and machine learning fundamentals',
      },
      {
        name: 'DevOps',
        description: 'Infrastructure and deployment automation',
      },
      {
        name: 'Database',
        description: 'Database design and management',
      },
      {
        name: 'Programming Languages',
        description: 'Learn various programming languages',
      },
      {
        name: 'Cloud Computing',
        description: 'Cloud platforms and services',
      },
    ];

    const categories = await Promise.all(
      categoriesData.map((data) =>
        this.categoryRepository.save(this.categoryRepository.create(data)),
      ),
    );

    this.logger.log(`  ✅ Seeded ${categories.length} categories`);
    return categories;
  }

  private async seedCourses(
    instructors: User[],
    categories: Category[],
  ): Promise<Course[]> {
    this.logger.log('🎓 Seeding courses...');

    const coursesData = [
      {
        title: 'Complete Web Development Bootcamp',
        description:
          'Learn HTML, CSS, JavaScript, React, Node.js and more in this comprehensive bootcamp.',
        instructor: instructors[0],
        price: 49999,
        isActive: true,
        language: 'English',
        thumbnail_url:
          'https://images.unsplash.com/photo-1498050108023-c5249f4df085',
        categories: [categories[0], categories[6]],
        metadata: {
          language: 'English',
          level: 'Beginner',
          whatYoullLearn: [
            'HTML5 and CSS3 fundamentals',
            'JavaScript ES6+',
            'React.js framework',
            'Node.js and Express',
            'MongoDB database',
          ],
        },
        average_rating: 4.7,
        total_reviews: 234,
      },
      {
        title: 'React Native - The Practical Guide',
        description:
          'Build native mobile apps for iOS and Android using React Native and JavaScript.',
        instructor: instructors[0],
        price: 39999,
        isActive: true,
        language: 'English',
        thumbnail_url:
          'https://images.unsplash.com/photo-1551650975-87deedd944c3',
        categories: [categories[1], categories[6]],
        metadata: {
          language: 'English',
          level: 'Intermediate',
          whatYoullLearn: [
            'React Native fundamentals',
            'Navigation and routing',
            'State management with Redux',
            'Native device features',
            'Publishing to app stores',
          ],
        },
        average_rating: 4.6,
        total_reviews: 189,
      },
      {
        title: 'Python for Data Science and Machine Learning',
        description:
          'Master Python, NumPy, Pandas, Matplotlib, and Scikit-learn for data science.',
        instructor: instructors[2],
        price: 54999,
        isActive: true,
        language: 'English',
        thumbnail_url:
          'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5',
        categories: [categories[2], categories[3], categories[6]],
        metadata: {
          language: 'English',
          level: 'Intermediate',
          whatYoullLearn: [
            'Python programming',
            'Data analysis with Pandas',
            'Data visualization',
            'Machine learning algorithms',
            'Deep learning basics',
          ],
        },
        average_rating: 4.8,
        total_reviews: 567,
      },
      {
        title: 'Full Stack JavaScript with Node.js',
        description:
          'Build complete web applications using JavaScript on both frontend and backend.',
        instructor: instructors[1],
        price: 44999,
        isActive: true,
        language: 'English',
        thumbnail_url:
          'https://images.unsplash.com/photo-1579468118864-1b9ea3c0db4a',
        categories: [categories[0], categories[6]],
        metadata: {
          language: 'English',
          level: 'Intermediate',
          whatYoullLearn: [
            'Node.js fundamentals',
            'Express.js framework',
            'RESTful API design',
            'Authentication and authorization',
            'Database integration',
          ],
        },
        average_rating: 4.5,
        total_reviews: 321,
      },
      {
        title: 'Docker and Kubernetes: The Complete Guide',
        description:
          'Master containerization and orchestration for modern application deployment.',
        instructor: instructors[1],
        price: 59999,
        isActive: true,
        language: 'English',
        thumbnail_url:
          'https://images.unsplash.com/photo-1605745341112-85968b19335b',
        categories: [categories[4], categories[7]],
        metadata: {
          language: 'English',
          level: 'Advanced',
          whatYoullLearn: [
            'Docker containers',
            'Kubernetes orchestration',
            'CI/CD pipelines',
            'Microservices architecture',
            'Cloud deployment',
          ],
        },
        average_rating: 4.9,
        total_reviews: 412,
      },
      {
        title: 'SQL and Database Design Mastery',
        description:
          'Learn SQL, database design principles, and work with PostgreSQL and MongoDB.',
        instructor: instructors[2],
        price: 34999,
        isActive: true,
        language: 'English',
        thumbnail_url:
          'https://images.unsplash.com/photo-1544383835-bda2bc66a55d',
        categories: [categories[5]],
        metadata: {
          language: 'English',
          level: 'Beginner',
          whatYoullLearn: [
            'SQL fundamentals',
            'Database design and normalization',
            'Advanced queries and joins',
            'PostgreSQL specifics',
            'NoSQL with MongoDB',
          ],
        },
        average_rating: 4.4,
        total_reviews: 178,
      },
    ];

    const courses = await Promise.all(
      coursesData.map((data) =>
        this.courseRepository.save(this.courseRepository.create(data)),
      ),
    );

    this.logger.log(`  ✅ Seeded ${courses.length} courses`);
    return courses;
  }

  private async seedSections(courses: Course[]): Promise<CourseSection[]> {
    this.logger.log('📖 Seeding course sections...');
    const sections = [];

    for (const course of courses) {
      const courseSections = [
        this.sectionRepository.create({
          title: 'Getting Started',
          description: 'Introduction and setup',
          orderIndex: 1,
          course: course,
        }),
        this.sectionRepository.create({
          title: 'Core Concepts',
          description: 'Learn the fundamental concepts',
          orderIndex: 2,
          course: course,
        }),
        this.sectionRepository.create({
          title: 'Advanced Topics',
          description: 'Deep dive into advanced features',
          orderIndex: 3,
          course: course,
        }),
        this.sectionRepository.create({
          title: 'Final Project',
          description: 'Build a complete project',
          orderIndex: 4,
          course: course,
        }),
      ];

      const savedSections = await this.sectionRepository.save(courseSections);
      sections.push(...savedSections);
    }

    this.logger.log(`  ✅ Seeded ${sections.length} course sections`);
    return sections;
  }

  private async seedLectures(sections: CourseSection[]): Promise<CourseLecture[]> {
    this.logger.log('🎥 Seeding course lectures...');
    const lectures = [];

    for (const section of sections) {
      const sectionLectures = [
        this.lectureRepository.create({
          title: 'Introduction',
          description: 'Welcome to this section',
          durationSeconds: 300,
          orderIndex: 1,
          contentType: 'video',
          content: {
            videoUrl: 'https://gmail.com/video1.mp4',
          },
          section: section,
        }),
        this.lectureRepository.create({
          title: 'Main Content',
          description: 'Core learning material',
          durationSeconds: 900,
          orderIndex: 2,
          contentType: 'video',
          content: {
            videoUrl: 'https://gmail.com/video2.mp4',
          },
          section: section,
        }),
        this.lectureRepository.create({
          title: 'Practice Exercise',
          description: 'Hands-on practice',
          durationSeconds: 600,
          orderIndex: 3,
          contentType: 'video',
          content: {
            videoUrl: 'https://gmail.com/video3.mp4',
          },
          section: section,
        }),
      ];

      const savedLectures = await this.lectureRepository.save(sectionLectures);
      lectures.push(...savedLectures);
    }

    this.logger.log(`  ✅ Seeded ${lectures.length} course lectures`);
    return lectures;
  }

  private async seedEnrollments(
    students: User[],
    courses: Course[],
  ): Promise<Enrollment[]> {
    this.logger.log('📝 Seeding enrollments...');
    const enrollments = [];

    for (let i = 0; i < students.length; i++) {
      const student = students[i];
      const enrolledCourses = courses.slice(0, Math.min(i + 2, courses.length));

      for (const course of enrolledCourses) {
        const enrollment = await this.enrollmentRepository.save(
          this.enrollmentRepository.create({
            student: student,
            course: course,
          }),
        );
        enrollments.push(enrollment);
      }
    }

    this.logger.log(`  ✅ Seeded ${enrollments.length} enrollments`);
    return enrollments;
  }

  private async seedReviews(
    students: User[],
    courses: Course[],
  ): Promise<Review[]> {
    this.logger.log('⭐ Seeding reviews...');
    const reviews = [];
    const reviewTexts = [
      'Excellent course! Very well explained and practical.',
      'Great content, learned a lot. Highly recommended!',
      'Good course but could use more examples.',
      'Outstanding instructor and course material.',
      'Very comprehensive and worth the investment.',
      'Helpful course with good pacing.',
    ];

    for (let i = 0; i < students.length; i++) {
      const student = students[i];
      const reviewedCourses = courses.slice(0, Math.min(i + 1, courses.length));

      for (const course of reviewedCourses) {
        const review = await this.reviewRepository.save(
          this.reviewRepository.create({
            user: student,
            course: course,
            rating: Math.floor(Math.random() * 2) + 4,
            comment: reviewTexts[Math.floor(Math.random() * reviewTexts.length)],
          }),
        );
        reviews.push(review);
      }
    }

    this.logger.log(`  ✅ Seeded ${reviews.length} reviews`);
    return reviews;
  }

  private async seedOrders(
    students: User[],
    courses: Course[],
  ): Promise<Order[]> {
    this.logger.log('💳 Seeding orders...');
    const orders = [];

    for (let i = 0; i < students.length; i++) {
      const student = students[i];
      const purchasedCourses = courses.slice(0, Math.min(i + 2, courses.length));

      const order = await this.orderRepository.save(
        this.orderRepository.create({
          user: student,
          totalPrice: purchasedCourses.reduce(
            (sum, course) => sum + course.price,
            0,
          ),
          status: OrderStatus.COMPLETED,
          paymentMethod: PaymentMethod.VNPAY,
        }),
      );

      for (const course of purchasedCourses) {
        await this.orderCourseRepository.save(
          this.orderCourseRepository.create({
            order: order,
            course: course,
            price: course.price,
          }),
        );
      }

      orders.push(order);
    }

    this.logger.log(`  ✅ Seeded ${orders.length} orders`);
    return orders;
  }

  private async seedCarts(students: User[], courses: Course[]): Promise<Cart[]> {
    this.logger.log('🛒 Seeding carts...');
    const carts = [];

    for (let i = 0; i < Math.min(students.length, 3); i++) {
      const student = students[i];
      const cart = await this.cartRepository.save(
        this.cartRepository.create({
          user: student,
        }),
      );

      const cartCourses = courses.slice(i, i + 2);
      for (const course of cartCourses) {
        await this.cartItemRepository.save(
          this.cartItemRepository.create({
            cart: cart,
            course: course,
            price: course.price,
          }),
        );
      }

      carts.push(cart);
    }

    this.logger.log(`  ✅ Seeded ${carts.length} carts`);
    return carts;
  }

  private async seedSupportTickets(
    students: User[],
    instructors: User[],
    courses: Course[],
  ): Promise<SupportTicket[]> {
    this.logger.log('🎫 Seeding support tickets...');
    const tickets = [];
    const subjects = [
      'Question about course content',
      'Technical issue with video playback',
      'Request for additional resources',
      'Clarification on assignment',
      'Course completion certificate inquiry',
    ];

    for (let i = 0; i < Math.min(students.length, 3); i++) {
      const student = students[i];
      const course = courses[i % courses.length];

      const ticket = await this.ticketRepository.save(
        this.ticketRepository.create({
          subject: subjects[i % subjects.length],
          student: student,
          instructor: course.instructor,
          course: course,
          status: [
            TicketStatus.OPEN,
            TicketStatus.WAITING_TEACHER,
            TicketStatus.WAITING_STUDENT,
          ][Math.floor(Math.random() * 3)],
        }),
      );
      tickets.push(ticket);
    }

    this.logger.log(`  ✅ Seeded ${tickets.length} support tickets`);
    return tickets;
  }

  private async seedTicketMessages(tickets: SupportTicket[]): Promise<void> {
    this.logger.log('💬 Seeding ticket messages...');
    const messages = [];

    for (const ticket of tickets) {
      const studentMessages = [
        `Hello, I have a question about ${ticket.subject.toLowerCase()}.`,
        'Could you please provide more details on this topic?',
        'Thank you for the explanation!',
      ];

      const instructorMessages = [
        'Hi! Thanks for reaching out. Let me help you with that.',
        'Here are some additional resources that might help.',
        "You're welcome! Feel free to ask if you have more questions.",
      ];

      messages.push(
        await this.messageModel.create({
          ticketId: ticket.id,
          senderId: ticket.student.id,
          senderRole: 'student',
          message: studentMessages[0],
          isRead: true,
        }),
      );

      messages.push(
        await this.messageModel.create({
          ticketId: ticket.id,
          senderId: ticket.instructor.id,
          senderRole: 'teacher',
          message: instructorMessages[0],
          isRead: true,
        }),
      );

      if (Math.random() > 0.5) {
        messages.push(
          await this.messageModel.create({
            ticketId: ticket.id,
            senderId: ticket.student.id,
            senderRole: 'student',
            message: studentMessages[1],
            isRead: false,
          }),
        );
      }
    }

    this.logger.log(`  ✅ Seeded ${messages.length} ticket messages`);
  }
}
