import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class EmailTemplate extends Document {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  type: string;

  @Prop({ required: true })
  subject: string;

  @Prop({ required: true })
  content: string;

  @Prop({ type: [String] })
  variables: string[];

  @Prop({ type: Object })
  translations: Record<string, {
    subject: string;
    content: string;
  }>;

  @Prop({ default: true })
  isActive: boolean;

  @Prop()
  lastModifiedBy: string;

  @Prop({ type: [Object] })
  history: {
    content: string;
    modifiedBy: string;
    modifiedAt: Date;
  }[];
}

export const EmailTemplateSchema = SchemaFactory.createForClass(EmailTemplate); 