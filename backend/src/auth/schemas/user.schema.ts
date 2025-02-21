import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export enum UserRole {
  ADMIN = 'admin',
  CUSTOMER = 'customer',
}

@Schema({ timestamps: true })
export class User extends Document {
  @Prop({ required: true })
  email: string;

  @Prop({ required: true })
  passwordHash: string;

  @Prop({ required: true })
  firstName: string;

  @Prop({ required: true })
  lastName: string;

  @Prop({ enum: UserRole, default: UserRole.CUSTOMER })
  role: UserRole;

  @Prop()
  address?: string;

  @Prop()
  phoneNumber?: string;

  @Prop()
  bankAccount?: string;
}

export const UserSchema = SchemaFactory.createForClass(User); 