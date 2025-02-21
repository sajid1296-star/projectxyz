import { Entity, Column, PrimaryGeneratedColumn, OneToMany } from 'typeorm';
import { Order } from './order.entity';
import { TradeIn } from './trade-in.entity';

@Entity()
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ unique: true })
  email: string;

  @Column()
  password: string;

  @Column({ default: 'user' })
  role: string;

  @Column({ nullable: true })
  address: string;

  @Column({ nullable: true })
  phone: string;

  @OneToMany(() => Order, order => order.user)
  orders: Order[];

  @OneToMany(() => TradeIn, tradeIn => tradeIn.user)
  tradeIns: TradeIn[];
} 