import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { TradeInsService } from './trade-ins.service';
import { CreateTradeInDto } from './dto/create-trade-in.dto';
import { UpdateTradeInDto } from './dto/update-trade-in.dto';
import { UpdateStatusDto } from './dto/update-status.dto';

@Controller('trade-ins')
@UseGuards(JwtAuthGuard)
export class TradeInsController {
  constructor(private readonly tradeInsService: TradeInsService) {}

  @Get()
  @Roles('admin')
  @UseGuards(RolesGuard)
  findAll(@Query() query) {
    return this.tradeInsService.findAll(query);
  }

  @Get('my')
  findMyTradeIns(@Request() req, @Query() query) {
    return this.tradeInsService.findAll({ ...query, userId: req.user.id });
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Request() req) {
    return this.tradeInsService.findOne(id);
  }

  @Post()
  create(@Request() req, @Body() createTradeInDto: CreateTradeInDto) {
    return this.tradeInsService.create(req.user.id, createTradeInDto);
  }

  @Put(':id')
  @Roles('admin')
  @UseGuards(RolesGuard)
  update(@Param('id') id: string, @Body() updateTradeInDto: UpdateTradeInDto) {
    return this.tradeInsService.update(id, updateTradeInDto);
  }

  @Put(':id/status')
  @Roles('admin')
  @UseGuards(RolesGuard)
  updateStatus(@Param('id') id: string, @Body() updateStatusDto: UpdateStatusDto) {
    return this.tradeInsService.updateStatus(
      id,
      updateStatusDto.status,
      updateStatusDto.adminNote,
    );
  }

  @Delete(':id')
  @Roles('admin')
  @UseGuards(RolesGuard)
  remove(@Param('id') id: string) {
    return this.tradeInsService.remove(id);
  }
} 