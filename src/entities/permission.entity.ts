import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToMany,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Role } from './role.entity';

@Entity()
export class Permission {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: true })
  api: string; // e.g., '/api/users', '/api/courses'

  @Column({ nullable: true })
  description: string;

  @Column({ nullable: true })
  method: string; // e.g., 'GET', 'POST', 'PUT', 'DELETE'

  @Column({ nullable: true })
  module: string; // e.g., 'User', 'Course', 'Auth'

  @CreateDateColumn()
  created: Date;

  @UpdateDateColumn()
  updated: Date;

  @ManyToMany(() => Role, (role) => role.permissions)
  roles: Role[];
}
