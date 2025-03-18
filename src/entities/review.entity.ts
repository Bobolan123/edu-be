import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { User } from './user.entity';
import { Course } from './course.entity';

@Entity()
export class Review {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, (user) => user.reviews)
  user: User;

  @ManyToOne(() => Course, (course) => course.reviews)
  course: Course;

  @Column({ type: 'int', default: 0 })
  rating: number;

  @Column('text', { nullable: true })
  comment: string;

  @Column({ default: () => 'CURRENT_TIMESTAMP' })
  date_reviewed: Date;
}

  
// const reviewRepo = dataSource.getRepository(Review);
// const courseRepo = dataSource.getRepository(Course);

// async function addReview(userId: number, courseId: number, rating: number, comment?: string) {
//   // Find the user and course
//   const user = await dataSource.getRepository(User).findOneBy({ id: userId });
//   const course = await courseRepo.findOne({ where: { id: courseId }, relations: ['reviews'] });

//   if (!user || !course) throw new Error('User or Course not found');

//   // Check if the user already reviewed
//   const existingReview = await reviewRepo.findOne({ where: { user, course } });

//   if (existingReview) {
//     // Update existing review
//     existingReview.rating = rating;
//     existingReview.comment = comment || existingReview.comment;
//     await reviewRepo.save(existingReview);
//   } else {
//     // Create new review
//     const newReview = reviewRepo.create({ user, course, rating, comment });
//     await reviewRepo.save(newReview);
//   }

//   // Recalculate the course's average rating
//   const totalReviews = await reviewRepo.count({ where: { course } });
//   const totalRating = await reviewRepo.sum('rating', { where: { course } });

//   course.average_rating = totalReviews ? totalRating / totalReviews : 0;
//   await courseRepo.save(course);

//   return course;
// }
