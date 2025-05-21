import { Entity, PrimaryGeneratedColumn, Column, ManyToMany } from 'typeorm';
import { Course } from './course.entity';

@Entity()
export class Category {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  name: string;

  @Column({ nullable: true })
  description: string;

  @ManyToMany(() => Course, (course) => course.categories, {
    onDelete: 'CASCADE',
  })
  courses: Course[];
}
