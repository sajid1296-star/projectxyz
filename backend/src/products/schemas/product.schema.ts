import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export enum ProductCategory {
  SMARTPHONE = 'smartphone',
  TABLET = 'tablet',
  LAPTOP = 'laptop',
  SMARTWATCH = 'smartwatch',
  CONSOLE = 'console',
}

export enum ProductCondition {
  NEW = 'new',
  LIKE_NEW = 'like_new',
  GOOD = 'good',
  FAIR = 'fair',
}

@Schema({ timestamps: true })
export class Product extends Document {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  brand: string;

  @Prop({ required: true })
  model: string;

  @Prop({ required: true })
  price: number;

  @Prop({ default: 0 })
  discountPrice?: number;

  @Prop({ required: true })
  description: string;

  @Prop([String])
  images: string[];

  @Prop({ enum: ProductCategory, required: true })
  category: ProductCategory;

  @Prop({ enum: ProductCondition, required: true })
  condition: ProductCondition;

  @Prop({ default: 0 })
  stock: number;

  @Prop({ type: Object })
  specifications: Record<string, any>;

  @Prop({ default: true })
  isActive: boolean;
}

export const ProductSchema = SchemaFactory.createForClass(Product); 