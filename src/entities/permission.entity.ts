import { Entity, PrimaryGeneratedColumn, Column, ManyToMany } from 'typeorm';
import { Role } from './role.entity';

@Entity()
export class Permission {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  action: string; // e.g., 'CREATE_USER', 'DELETE_POST'

  @ManyToMany(() => Role, (role) => role.permissions)
  roles: Role[];
}
