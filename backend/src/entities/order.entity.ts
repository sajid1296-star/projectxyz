import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, OneToMany } from 'typeorm';
import { User } from './user.entity';
import { OrderItem } from './order-item.entity';

@Entity()
export class Order {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, user => user.orders)
  user: User;

  @OneToMany(() => OrderItem, orderItem => orderItem.order)
  items: OrderItem[];

  @Column('decimal', { precision: 10, scale: 2 })
  total: number;

  @Column()
  status: string;

  @Column()
  shippingAddress: string;

  @Column({ nullable: true })
  trackingNumber: string;

  @Column({ nullable: true })
  paymentIntentId: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  paidAt: Date;
} 