import { 
    Entity, 
    PrimaryGeneratedColumn, 
    Column, 
    ManyToOne, 
    OneToMany 
  } from 'typeorm';
  
  import { Course } from './course.entity';
  import { Lesson } from './lesson.entity';
  
  @Entity()
  export class Section {
    @PrimaryGeneratedColumn()
    id: number;
  
    @ManyToOne(() => Course, (course) => course.sections, { onDelete: 'CASCADE' })
    course: Course;
  
    @Column({ type: 'varchar', length: 255 })
    title: string;
  
    @Column({ type: 'int' }) // Defines the order of sections in a course
    order: number;
  
    @OneToMany(() => Lesson, (lesson) => lesson.section, { cascade: true })
    lessons: Lesson[];
  }
  