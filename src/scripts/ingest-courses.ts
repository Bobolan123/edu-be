import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import { Course } from '../entities/course.entity';
import { CourseSection } from '../entities/course-section.entity';
import { CourseLecture } from '../entities/course-lecture.entity';
import { User } from '../entities/user.entity';
import { Category } from '../entities/category.entity';
import { Enrollment } from '../entities/enrollment.entity';
import { Review } from '../entities/review.entity';
import { ReviewVote } from '../entities/review-vote.entity';
import { Certification } from '../entities/certification.entity';
import { Role } from '../entities/role.entity';
import { Permission } from '../entities/permission.entity';
import { Order } from '../entities/order.entity';
import { OrderCourse } from '../entities/order-course.entity';
import { Cart } from '../entities/cart.entity';
import { CartItem } from '../entities/cartItem.entity';
import { LectureProgress } from '../entities/lecture-progress.entity';
import { QdrantService } from '../modules/qdrant/qdrant.service';
import { GeminiService } from '../modules/gemini/gemini.service';
import { QuizContent } from '../interfaces/course-content.interface';

config();

function extractLectureText(
  lecture: CourseLecture,
  section: CourseSection,
  course: Course,
): string {
  let text = `Course: ${course.title}\n`;
  text += `Description: ${course.description}\n`;

  if (course.metadata?.whatYoullLearn) {
    text += `What you'll learn: ${course.metadata.whatYoullLearn.join(', ')}\n`;
  }

  text += `Section: ${section.title}\n`;
  if (section.description) {
    text += `Section Description: ${section.description}\n`;
  }

  text += `Lecture: ${lecture.title}\n`;
  if (lecture.description) {
    text += `Lecture Description: ${lecture.description}\n`;
  }

  if (lecture.contentType === 'quiz') {
    const quizContent = lecture.content as QuizContent;
    quizContent.questions.forEach((q, idx) => {
      text += `\nQuestion ${idx + 1}: ${q.question}`;
      if (q.options) {
        text += `\nOptions: ${q.options.join(', ')}`;
      }
      if (q.explanation) {
        text += `\nExplanation: ${q.explanation}`;
      }
    });
  }

  return text;
}

async function main() {
  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '5432'),
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    entities: [
      Course,
      CourseSection,
      CourseLecture,
      User,
      Category,
      Enrollment,
      Review,
      ReviewVote,
      Certification,
      Role,
      Permission,
      Order,
      OrderCourse,
      Cart,
      CartItem,
      LectureProgress,
    ],
    synchronize: false,
    logging: false,
    ssl:
      process.env.APP_ENV === 'prod' || process.env.APP_ENV === 'dev'
        ? { rejectUnauthorized: false }
        : false,
  });

  await dataSource.initialize();
  console.log('Database connected');

  const qdrantService = new QdrantService();
  await qdrantService.onModuleInit();
  console.log('Qdrant initialized');

  const geminiService = new GeminiService(qdrantService);
  console.log('Gemini initialized');

  const courseRepository = dataSource.getRepository(Course);
  const courses = await courseRepository.find({
    relations: ['sections', 'sections.lectures'],
    order: {
      id: 'ASC',
      sections: {
        orderIndex: 'ASC',
        lectures: {
          orderIndex: 'ASC',
        },
      },
    },
  });

  console.log(`Found ${courses.length} courses to process`);

  let totalLectures = 0;
  let processedLectures = 0;

  for (const course of courses) {
    console.log(`\nProcessing course: ${course.title} (ID: ${course.id})`);

    if (!course.sections || course.sections.length === 0) {
      console.log('  No sections found, skipping...');
      continue;
    }

    for (const section of course.sections) {
      console.log(`  Section: ${section.title}`);

      if (!section.lectures || section.lectures.length === 0) {
        console.log('    No lectures found, skipping...');
        continue;
      }

      for (const lecture of section.lectures) {
        totalLectures++;
        try {
          console.log(
            `    Processing lecture: ${lecture.title} (${lecture.contentType})`,
          );

          const text = extractLectureText(lecture, section, course);
          console.log(`      Extracted ${text.length} characters`);

          const embedding = await geminiService.generateEmbedding(text);
          console.log(
            `      Generated embedding with ${embedding.length} dimensions`,
          );

          await qdrantService.upsertVector(lecture.id, embedding, {
            lectureId: lecture.id,
            courseId: course.id,
            sectionId: section.id,
            title: lecture.title,
            description: lecture.description || '',
            text,
          });

          processedLectures++;
          console.log(`      ✓ Stored in Qdrant`);
        } catch (error) {
          console.error(
            `      ✗ Error processing lecture ${lecture.id}:`,
            error.message,
          );
        }
      }
    }
  }

  await dataSource.destroy();

  console.log('\n=== Ingestion Complete ===');
  console.log(`Total lectures found: ${totalLectures}`);
  console.log(`Successfully processed: ${processedLectures}`);
  console.log(`Failed: ${totalLectures - processedLectures}`);
}

main()
  .then(() => {
    console.log('Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Script failed:', error);
    process.exit(1);
  });
