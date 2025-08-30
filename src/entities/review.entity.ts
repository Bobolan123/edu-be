import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany } from 'typeorm';
import { User } from './user.entity';
import { Course } from './course.entity';
import { ReviewVote } from './review-vote.entity';

export enum ReviewStatus {
  PUBLISHED = 'published',
  HIDDEN = 'hidden',
}

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

  @Column({
    type: 'enum',
    enum: ReviewStatus,
    default: ReviewStatus.PUBLISHED,
  })
  status: ReviewStatus;

  @Column({ type: 'int', default: 0 })
  upVotes: number;

  @Column({ type: 'int', default: 0 })
  downVotes: number;

  @OneToMany(() => ReviewVote, (vote) => vote.review)
  votes: ReviewVote[];

  @Column({ default: () => 'CURRENT_TIMESTAMP' })
  date_reviewed: Date;
}
