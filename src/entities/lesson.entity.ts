import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { Section } from './section.entity';

@Entity()
export class Lesson {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  title: string;

  @Column('text')
  description: string;

  @Column({ nullable: true })
  video_url: string;

  @Column({ nullable: true })
  stream_recording_url: string;

  @Column()
  order: number;

  @Column()
  duration: number;

  @Column({ nullable: true }) // ✅ Ensure `resources` is optional
  resources?: string;

  @ManyToOne(() => Section, (section) => section.lessons, { eager: true }) // ✅ Ensure `section` relation is defined
  section: Section;
}
