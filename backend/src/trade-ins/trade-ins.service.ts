import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TradeIn } from '../entities/trade-in.entity';
import { CreateTradeInDto } from './dto/create-trade-in.dto';
import { UpdateTradeInDto } from './dto/update-trade-in.dto';
import { UsersService } from '../users/users.service';

@Injectable()
export class TradeInsService {
  constructor(
    @InjectRepository(TradeIn)
    private tradeInsRepository: Repository<TradeIn>,
    private usersService: UsersService,
  ) {}

  async findAll(query: any = {}) {
    const { status, userId, ...rest } = query;
    
    const queryBuilder = this.tradeInsRepository
      .createQueryBuilder('tradeIn')
      .leftJoinAndSelect('tradeIn.user', 'user');

    if (status) {
      queryBuilder.andWhere('tradeIn.status = :status', { status });
    }

    if (userId) {
      queryBuilder.andWhere('tradeIn.user.id = :userId', { userId });
    }

    return queryBuilder.getMany();
  }

  async findOne(id: string) {
    const tradeIn = await this.tradeInsRepository.findOne({
      where: { id },
      relations: ['user'],
    });
    
    if (!tradeIn) {
      throw new NotFoundException('Trade-In nicht gefunden');
    }
    
    return tradeIn;
  }

  async create(userId: string, createTradeInDto: CreateTradeInDto) {
    const user = await this.usersService.findOne(userId);
    
    const tradeIn = this.tradeInsRepository.create({
      ...createTradeInDto,
      user,
      status: 'pending',
    });

    return this.tradeInsRepository.save(tradeIn);
  }

  async update(id: string, updateTradeInDto: UpdateTradeInDto) {
    const tradeIn = await this.findOne(id);
    
    Object.assign(tradeIn, updateTradeInDto);
    
    return this.tradeInsRepository.save(tradeIn);
  }

  async updateStatus(id: string, status: string, adminNote?: string) {
    const tradeIn = await this.findOne(id);
    
    tradeIn.status = status;
    if (adminNote) {
      tradeIn.adminNote = adminNote;
    }
    
    return this.tradeInsRepository.save(tradeIn);
  }

  async remove(id: string) {
    const tradeIn = await this.findOne(id);
    await this.tradeInsRepository.remove(tradeIn);
  }
} 