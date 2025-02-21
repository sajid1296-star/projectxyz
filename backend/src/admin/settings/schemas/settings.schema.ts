import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class Settings extends Document {
  @Prop({ required: true })
  type: string;

  @Prop({ type: Object })
  smtp: {
    host: string;
    port: number;
    secure: boolean;
    user: string;
    pass: string;
  };

  @Prop({ type: Object })
  sender: {
    name: string;
    email: string;
  };

  @Prop({ type: Object })
  company: {
    name: string;
    address: string;
    logo: string;
    support: {
      email: string;
      phone: string;
    };
  };

  @Prop({ type: Object })
  templates: {
    baseDir: string;
    defaultLocale: string;
  };

  @Prop({ type: Object })
  customization: {
    colors: {
      primary: string;
      secondary: string;
      accent: string;
    };
    logo: {
      url: string;
      width: number;
      height: number;
    };
  };
}

export const SettingsSchema = SchemaFactory.createForClass(Settings); 