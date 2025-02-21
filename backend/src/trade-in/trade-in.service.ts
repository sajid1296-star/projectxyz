import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { TradeIn, DeviceCondition } from './schemas/trade-in.schema';
import { EmailService } from '../email/email.service';

@Injectable()
export class TradeInService {
  constructor(
    @InjectModel(TradeIn.name) private tradeInModel: Model<TradeIn>,
    private emailService: EmailService,
  ) {}

  async create(userId: string, createTradeInDto: any): Promise<TradeIn> {
    const estimatedPrice = await this.calculateEstimatedPrice(
      createTradeInDto.deviceType,
      createTradeInDto.brand,
      createTradeInDto.model,
      createTradeInDto.condition
    );

    const tradeIn = new this.tradeInModel({
      ...createTradeInDto,
      userId,
      estimatedPrice,
    });

    return tradeIn.save();
  }

  async findByUser(
    userId: string,
    filters?: {
      status?: string;
      deviceType?: string;
      brand?: string;
      startDate?: Date;
      endDate?: Date;
      minPrice?: number;
      maxPrice?: number;
      search?: string;
    },
    sort: { [key: string]: 1 | -1 } = { createdAt: -1 },
    page: number = 1,
    limit: number = 10
  ) {
    const query: any = { userId };

    if (filters?.status) query.status = filters.status;
    if (filters?.deviceType) query.deviceType = filters.deviceType;
    if (filters?.brand) query.brand = filters.brand;

    if (filters?.startDate || filters?.endDate) {
      query.createdAt = {};
      if (filters.startDate) query.createdAt.$gte = filters.startDate;
      if (filters.endDate) query.createdAt.$lte = filters.endDate;
    }

    if (filters?.minPrice || filters?.maxPrice) {
      query.estimatedPrice = {};
      if (filters.minPrice) query.estimatedPrice.$gte = filters.minPrice;
      if (filters.maxPrice) query.estimatedPrice.$lte = filters.maxPrice;
    }

    if (filters?.search) {
      query.$or = [
        { model: { $regex: filters.search, $options: 'i' } },
        { brand: { $regex: filters.search, $options: 'i' } },
        { deviceType: { $regex: filters.search, $options: 'i' } }
      ];
    }

    const skip = (page - 1) * limit;

    const [tradeIns, total] = await Promise.all([
      this.tradeInModel
        .find(query)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .exec(),
      this.tradeInModel.countDocuments(query)
    ]);

    // Berechne Statistiken für die gefilterten Trade-Ins
    const stats = await this.tradeInModel.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          totalEstimatedValue: { $sum: '$estimatedPrice' },
          totalFinalValue: { $sum: '$finalPrice' },
          avgEstimatedValue: { $avg: '$estimatedPrice' },
          totalTradeIns: { $sum: 1 },
          deviceTypes: { $addToSet: '$deviceType' },
          brands: { $addToSet: '$brand' },
          statusCounts: {
            $push: '$status'
          }
        }
      }
    ]);

    return {
      tradeIns,
      pagination: {
        total,
        pages: Math.ceil(total / limit),
        page,
        limit
      },
      stats: stats[0] || null
    };
  }

  async findOne(id: string, userId: string): Promise<TradeIn> {
    const tradeIn = await this.tradeInModel.findOne({ _id: id, userId });
    if (!tradeIn) {
      throw new NotFoundException('Ankauf-Anfrage nicht gefunden');
    }
    return tradeIn;
  }

  private async calculateEstimatedPrice(
    deviceType: string,
    brand: string,
    model: string,
    condition: DeviceCondition
  ): Promise<number> {
    // Hier würde die eigentliche Preisberechnung implementiert werden
    // Dies ist ein vereinfachtes Beispiel
    const basePrice = {
      smartphone: 300,
      tablet: 200,
      laptop: 500,
    }[deviceType] || 100;

    const conditionMultiplier = {
      [DeviceCondition.NEW]: 1,
      [DeviceCondition.LIKE_NEW]: 0.8,
      [DeviceCondition.GOOD]: 0.6,
      [DeviceCondition.FAIR]: 0.4,
      [DeviceCondition.POOR]: 0.2,
    }[condition];

    return basePrice * conditionMultiplier;
  }

  async updateStatus(
    id: string,
    status: string,
    finalPrice?: number,
    trackingNumber?: string,
    note?: string,
    updatedBy?: string
  ) {
    const tradeIn = await this.tradeInModel.findById(id);
    if (!tradeIn) {
      throw new NotFoundException('Trade-In nicht gefunden');
    }

    const update: any = { status };
    if (finalPrice !== undefined) {
      update.finalPrice = finalPrice;
    }
    if (trackingNumber) {
      update.trackingNumber = trackingNumber;
    }

    // Füge den Verlaufseintrag hinzu
    const historyEntry = {
      status,
      timestamp: new Date(),
      note,
      updatedBy,
    };
    update.$push = { history: historyEntry };

    const updatedTradeIn = await this.tradeInModel
      .findByIdAndUpdate(id, update, { new: true })
      .populate('userId', 'email');

    // Sende E-Mail-Benachrichtigung
    await this.emailService.sendTradeInStatusUpdate(
      updatedTradeIn.userId.email,
      id,
      status,
      finalPrice,
      trackingNumber
    );

    return updatedTradeIn;
  }

  async getTradeInAnalytics(userId: string, period: 'week' | 'month' | 'year') {
    const dateRange = this.getDateRange(period);
    
    return this.tradeInModel.aggregate([
      {
        $match: {
          userId,
          createdAt: { $gte: dateRange.start, $lte: dateRange.end }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: period === 'week' ? '%Y-%m-%d' : '%Y-%m',
              date: '$createdAt'
            }
          },
          count: { $sum: 1 },
          estimatedTotal: { $sum: '$estimatedPrice' },
          finalTotal: { $sum: '$finalPrice' }
        }
      },
      { $sort: { '_id': 1 } }
    ]);
  }

  private getDateRange(period: 'week' | 'month' | 'year') {
    const end = new Date();
    const start = new Date();
    
    switch (period) {
      case 'week':
        start.setDate(start.getDate() - 7);
        break;
      case 'month':
        start.setMonth(start.getMonth() - 1);
        break;
      case 'year':
        start.setFullYear(start.getFullYear() - 1);
        break;
    }
    
    return { start, end };
  }

  async calculateEstimatedPrice(
    deviceType: string,
    brand: string,
    model: string,
    condition: string,
    specifications: Record<string, any>
  ): Promise<number> {
    // Erweiterte Preisberechnung mit mehr Faktoren
    const basePrice = await this.getBasePrice(deviceType, brand, model);
    const conditionMultiplier = this.getConditionMultiplier(condition);
    const specMultiplier = this.calculateSpecificationsMultiplier(specifications);

    return basePrice * conditionMultiplier * specMultiplier;
  }

  private async getBasePrice(deviceType: string, brand: string, model: string): Promise<number> {
    // Hier könnte eine externe API oder Datenbank für aktuelle Marktpreise abgefragt werden
    // Beispielhafte Implementation
    const basePrices = {
      smartphone: {
        apple: { base: 400, premium: 800 },
        samsung: { base: 300, premium: 600 },
        default: 200
      },
      tablet: {
        apple: { base: 300, premium: 600 },
        samsung: { base: 200, premium: 400 },
        default: 150
      },
      laptop: {
        apple: { base: 600, premium: 1200 },
        default: 400
      }
    };

    return basePrices[deviceType]?.[brand]?.base || basePrices[deviceType]?.default || 100;
  }

  private getConditionMultiplier(condition: string): number {
    const multipliers = {
      new: 1,
      like_new: 0.9,
      good: 0.8,
      fair: 0.6,
      poor: 0.4,
    };
    return multipliers[condition] || 0.5;
  }

  private calculateSpecificationsMultiplier(specs: Record<string, any>): number {
    let multiplier = 1;

    // Speicher-Multiplikator
    if (specs.storage) {
      const storageGB = parseInt(specs.storage);
      if (storageGB >= 512) multiplier *= 1.3;
      else if (storageGB >= 256) multiplier *= 1.2;
      else if (storageGB >= 128) multiplier *= 1.1;
    }

    // RAM-Multiplikator
    if (specs.ram) {
      const ramGB = parseInt(specs.ram);
      if (ramGB >= 16) multiplier *= 1.2;
      else if (ramGB >= 8) multiplier *= 1.1;
    }

    // Zubehör-Multiplikator
    if (Array.isArray(specs.accessories) && specs.accessories.length > 0) {
      multiplier *= 1 + (specs.accessories.length * 0.05);
    }

    return multiplier;
  }

  async findOneWithDetails(id: string) {
    const tradeIn = await this.tradeInModel
      .findById(id)
      .populate('userId', 'email firstName lastName')
      .exec();

    if (!tradeIn) {
      throw new NotFoundException('Trade-In nicht gefunden');
    }

    return {
      ...tradeIn.toObject(),
      images: await this.getImages(id),
      history: await this.getHistory(id),
    };
  }

  async updateInspection(
    id: string,
    inspectionData: {
      condition: string;
      functionalityTest: Record<string, boolean>;
      cosmetic: Record<string, string>;
      accessories: string[];
      notes: string;
    },
    updatedBy: string
  ) {
    const tradeIn = await this.tradeInModel.findById(id);
    if (!tradeIn) {
      throw new NotFoundException('Trade-In nicht gefunden');
    }

    // Berechne den finalen Preis basierend auf der Inspektion
    const conditionMultiplier = this.getConditionMultiplier(inspectionData.condition);
    const functionalityMultiplier = this.calculateFunctionalityMultiplier(
      inspectionData.functionalityTest
    );
    const cosmeticMultiplier = this.calculateCosmeticMultiplier(
      inspectionData.cosmetic
    );
    const accessoriesBonus = this.calculateAccessoriesBonus(
      inspectionData.accessories
    );

    const finalPrice = Math.round(
      tradeIn.estimatedPrice *
      conditionMultiplier *
      functionalityMultiplier *
      cosmeticMultiplier +
      accessoriesBonus
    );

    const updatedTradeIn = await this.tradeInModel
      .findByIdAndUpdate(
        id,
        {
          inspectionResults: inspectionData,
          finalPrice,
          $push: {
            history: {
              status: 'inspected',
              timestamp: new Date(),
              note: 'Inspektion durchgeführt',
              updatedBy,
            },
          },
        },
        { new: true }
      )
      .populate('userId', 'email');

    return updatedTradeIn;
  }

  async getHistory(id: string) {
    const tradeIn = await this.tradeInModel.findById(id);
    if (!tradeIn) {
      throw new NotFoundException('Trade-In nicht gefunden');
    }
    return tradeIn.history;
  }

  async getImages(id: string) {
    const tradeIn = await this.tradeInModel.findById(id);
    if (!tradeIn) {
      throw new NotFoundException('Trade-In nicht gefunden');
    }
    // Implementieren Sie hier Ihre Bildabruflogik
    return tradeIn.images || [];
  }

  private calculateFunctionalityMultiplier(
    functionalityTest: Record<string, boolean>
  ): number {
    const workingItems = Object.values(functionalityTest).filter(
      (value) => value
    ).length;
    const totalItems = Object.keys(functionalityTest).length;
    return totalItems > 0 ? 0.4 + (0.6 * workingItems) / totalItems : 1;
  }

  private calculateCosmeticMultiplier(
    cosmetic: Record<string, string>
  ): number {
    const conditions = Object.values(cosmetic);
    const perfect = conditions.filter((c) => c === 'perfect').length;
    const good = conditions.filter((c) => c === 'good').length;
    const fair = conditions.filter((c) => c === 'fair').length;
    const total = conditions.length;

    if (total === 0) return 1;
    return (
      0.6 +
      (0.4 * (perfect + good * 0.7 + fair * 0.4)) / total
    );
  }

  private calculateAccessoriesBonus(accessories: string[]): number {
    return accessories.length * 5; // 5€ Bonus pro Zubehörteil
  }
} 