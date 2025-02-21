import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TradeInsService } from './trade-ins.service';
import { TradeInsController } from './trade-ins.controller';
import { TradeIn } from '../entities/trade-in.entity';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([TradeIn]),
    UsersModule,
  ],
  providers: [TradeInsService],
  controllers: [TradeInsController],
  exports: [TradeInsService],
})
export class TradeInsModule {} 