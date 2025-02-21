import { Controller, Get, Param, Put, Body, UseGuards, Query, NotFoundException, BadRequestException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { TradeInService } from './trade-in.service';
import { User } from '../auth/decorators/user.decorator';

@Controller('trade-in')
@UseGuards(AuthGuard('jwt'))
export class TradeInController {
  constructor(private readonly tradeInService: TradeInService) {}

  @Get(':id')
  async getTradeIn(@Param('id') id: string, @User() user: any) {
    return this.tradeInService.findOne(id, user._id);
  }

  @Put(':id/upload-images')
  async uploadImages(
    @Param('id') id: string,
    @User() user: any,
    @Body() { images }: { images: string[] }
  ) {
    return this.tradeInService.updateImages(id, user._id, images);
  }

  @Put(':id/cancel')
  async cancelTradeIn(@Param('id') id: string, @User() user: any) {
    return this.tradeInService.updateStatus(id, user._id, 'cancelled');
  }

  @Get('my')
  async getUserTradeIns(
    @User() user: any,
    @Query('status') status?: string,
    @Query('deviceType') deviceType?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'asc' | 'desc'
  ) {
    const filters: any = {};
    if (status) filters.status = status;
    if (deviceType) filters.deviceType = deviceType;
    if (startDate) filters.startDate = new Date(startDate);
    if (endDate) filters.endDate = new Date(endDate);

    const sort = {};
    if (sortBy) {
      sort[sortBy] = sortOrder === 'asc' ? 1 : -1;
    } else {
      sort['createdAt'] = -1;
    }

    return this.tradeInService.findByUser(user._id, filters, sort);
  }
}

@Controller('admin/trade-in')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('admin')
export class TradeInAdminController {
  constructor(private readonly tradeInService: TradeInService) {}

  @Get(':id')
  async getTradeInDetails(@Param('id') id: string) {
    const tradeIn = await this.tradeInService.findOneWithDetails(id);
    if (!tradeIn) {
      throw new NotFoundException('Trade-In nicht gefunden');
    }
    return tradeIn;
  }

  @Put(':id/status')
  async updateStatus(
    @Param('id') id: string,
    @Body() updateData: {
      status: string;
      note?: string;
      finalPrice?: number;
      trackingNumber?: string;
    },
    @User() user: any
  ) {
    if (updateData.status === 'completed' && !updateData.finalPrice) {
      throw new BadRequestException(
        'Finaler Preis wird für den Status "completed" benötigt'
      );
    }

    return this.tradeInService.updateStatus(
      id,
      updateData.status,
      updateData.finalPrice,
      updateData.trackingNumber,
      updateData.note,
      user.email
    );
  }

  @Put(':id/inspection')
  async updateInspection(
    @Param('id') id: string,
    @Body() inspectionData: {
      condition: string;
      functionalityTest: Record<string, boolean>;
      cosmetic: Record<string, string>;
      accessories: string[];
      notes: string;
    },
    @User() user: any
  ) {
    return this.tradeInService.updateInspection(id, inspectionData, user.email);
  }

  @Get(':id/history')
  async getTradeInHistory(@Param('id') id: string) {
    const history = await this.tradeInService.getHistory(id);
    if (!history) {
      throw new NotFoundException('Trade-In Historie nicht gefunden');
    }
    return history;
  }

  @Get(':id/images')
  async getTradeInImages(@Param('id') id: string) {
    const images = await this.tradeInService.getImages(id);
    if (!images) {
      throw new NotFoundException('Trade-In Bilder nicht gefunden');
    }
    return images;
  }
} 