import { Entity, Column, PrimaryGeneratedColumn, ManyToOne } from 'typeorm';
import { User } from './user.entity';

@Entity()
export class TradeIn {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, user => user.tradeIns)
  user: User;

  @Column()
  deviceName: string;

  @Column()
  brand: string;

  @Column()
  model: string;

  @Column()
  condition: string;

  @Column('decimal', { precision: 10, scale: 2 })
  offeredPrice: number;

  @Column({ default: 'pending' })
  status: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;
} 