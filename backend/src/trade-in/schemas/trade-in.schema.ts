import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export enum TradeInStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  RECEIVED = 'received',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export enum DeviceCondition {
  NEW = 'new',
  LIKE_NEW = 'like_new',
  GOOD = 'good',
  FAIR = 'fair',
  POOR = 'poor',
}

@Schema({ timestamps: true })
export class TradeIn extends Document {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  userId: string;

  @Prop({ required: true })
  deviceType: string;

  @Prop({ required: true })
  brand: string;

  @Prop({ required: true })
  model: string;

  @Prop({ enum: DeviceCondition, required: true })
  condition: DeviceCondition;

  @Prop([String])
  images: string[];

  @Prop({ type: Object })
  specifications: {
    storage?: string;
    color?: string;
    imei?: string;
    accessories?: string[];
  };

  @Prop()
  description: string;

  @Prop({ required: true })
  estimatedPrice: number;

  @Prop()
  finalPrice?: number;

  @Prop({ enum: TradeInStatus, default: TradeInStatus.PENDING })
  status: TradeInStatus;

  @Prop()
  adminNotes?: string;

  @Prop()
  trackingNumber?: string;

  @Prop({
    type: {
      iban: String,
      accountHolder: String,
    },
  })
  bankDetails: {
    iban: string;
    accountHolder: string;
  };
}

export const TradeInSchema = SchemaFactory.createForClass(TradeIn); 