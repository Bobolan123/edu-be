import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, Unique } from 'typeorm';
import { User } from './user.entity';
import { Review } from './review.entity';

export enum VoteType {
  UP = 'up',
  DOWN = 'down',
}

@Entity()
@Unique(['user', 'review'])   
export class ReviewVote {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  user: User;

  @ManyToOne(() => Review, (review) => review.votes, { onDelete: 'CASCADE' })
  review: Review;

  @Column({
    type: 'enum',
    enum: VoteType,
  })
  voteType: VoteType;

  @Column({ default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @Column({ default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
  updatedAt: Date;
}