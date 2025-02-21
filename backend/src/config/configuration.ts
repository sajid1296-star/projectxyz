import { ConfigModuleOptions } from '@nestjs/config';
import emailConfig from './email.config';

export const configModuleOptions: ConfigModuleOptions = {
  isGlobal: true,
  load: [emailConfig],
  envFilePath: ['.env.local', '.env'],
  validationSchema: {
    // ... andere Validierungen ...
    SMTP_HOST: {
      type: 'string',
      default: 'smtp.gmail.com',
    },
    SMTP_PORT: {
      type: 'number',
      default: 465,
    },
    SMTP_SECURE: {
      type: 'boolean',
      default: true,
    },
    SMTP_USER: {
      type: 'string',
      required: true,
    },
    SMTP_PASS: {
      type: 'string',
      required: true,
    },
    MAIL_FROM_NAME: {
      type: 'string',
      default: 'Trade-In Service',
    },
    MAIL_FROM_ADDRESS: {
      type: 'string',
      required: true,
    },
    COMPANY_NAME: {
      type: 'string',
      required: true,
    },
    COMPANY_ADDRESS: {
      type: 'string',
      required: true,
    },
    COMPANY_LOGO_URL: {
      type: 'string',
      required: true,
    },
    FRONTEND_URL: {
      type: 'string',
      required: true,
    },
  },
}; 