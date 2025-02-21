import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

@Schema()
export class CartItem {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Product', required: true })
  productId: string;

  @Prop({ required: true })
  quantity: number;

  @Prop({ required: true })
  price: number;

  @Prop()
  discountPrice?: number;
}

@Schema({ timestamps: true })
export class Cart extends Document {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  userId: string;

  @Prop([CartItem])
  items: CartItem[];

  @Prop({ default: 0 })
  total: number;
}

export const CartSchema = SchemaFactory.createForClass(Cart); 