import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from './user.entity';
import { Course } from './course.entity';

export enum TicketStatus {
  OPEN = 'open',
  WAITING_TEACHER = 'waiting_teacher',
  WAITING_STUDENT = 'waiting_student',
  RESOLVED = 'resolved',
}

@Entity()
export class SupportTicket {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  subject: string;

  @ManyToOne(() => User, { eager: true })
  student: User;

  @ManyToOne(() => User, { eager: true })
  instructor: User;

  @ManyToOne(() => Course, { eager: true })
  course: Course;

  @Column({
    type: 'enum',
    enum: TicketStatus,
    default: TicketStatus.OPEN,
  })
  status: TicketStatus;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
