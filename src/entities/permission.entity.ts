import { Entity, PrimaryGeneratedColumn, Column, ManyToMany } from 'typeorm';
import { Role } from './role.entity';
import { IsString } from 'class-validator';

@Entity()
export class Permission {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  action: string; // e.g., 'CREATE_USER', 'DELETE_POST'

  @Column({ unique: true })
  module: string; // e.g., 'User', 'Auth'

  @IsString()
  @Column()
  description: string; // e.g., 'User', 'Auth'

  @ManyToMany(() => Role, (role) => role.permissions)
  roles: Role[];
}
