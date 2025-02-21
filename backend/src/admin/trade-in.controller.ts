import { Controller, Get, Put, Body, Param, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { TradeInService } from '../trade-in/trade-in.service';

@Controller('admin/trade-in')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('admin')
export class AdminTradeInController {
  constructor(private readonly tradeInService: TradeInService) {}

  @Get()
  async getAllTradeIns() {
    return this.tradeInService.findAll();
  }

  @Put(':id/status')
  async updateStatus(
    @Param('id') id: string,
    @Body() { status, finalPrice, adminNotes, trackingNumber }: {
      status: string;
      finalPrice?: number;
      adminNotes?: string;
      trackingNumber?: string;
    }
  ) {
    return this.tradeInService.adminUpdateStatus(id, {
      status,
      finalPrice,
      adminNotes,
      trackingNumber,
    });
  }
} 