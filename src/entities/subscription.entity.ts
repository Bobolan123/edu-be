import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { User } from './user.entity';

@Entity()
export class Subscription {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, (user) => user.subscriptions)
  user: User;

  @Column()
  plan_name: string;

  @Column({ default: () => 'CURRENT_TIMESTAMP' })
  start_date: Date;

  @Column({ nullable: true })
  end_date: Date;

  @Column({ default: false })
  auto_renew: boolean;

  @Column({ default: 'active' })
  status: string;
}
