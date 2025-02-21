import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Settings } from './schemas/settings.schema';
import { EmailTemplate } from './schemas/email-template.schema';
import { EmailService } from '../../email/email.service';

@Injectable()
export class SettingsService {
  constructor(
    @InjectModel(Settings.name) private settingsModel: Model<Settings>,
    @InjectModel(EmailTemplate.name) private templateModel: Model<EmailTemplate>,
    private configService: ConfigService,
    private emailService: EmailService,
  ) {}

  // Template Methods
  async getAllTemplates() {
    return this.templateModel.find().sort({ name: 1 }).exec();
  }

  async getTemplateById(id: string) {
    return this.templateModel.findById(id).exec();
  }

  async createTemplate(template: any) {
    const newTemplate = new this.templateModel(template);
    return newTemplate.save();
  }

  async updateTemplate(id: string, template: any) {
    const existingTemplate = await this.templateModel.findById(id);
    if (!existingTemplate) {
      throw new NotFoundException('Template nicht gefunden');
    }

    // Füge den aktuellen Inhalt zur Historie hinzu
    const history = existingTemplate.history || [];
    history.push({
      content: existingTemplate.content,
      modifiedBy: template.lastModifiedBy,
      modifiedAt: new Date(),
    });

    return this.templateModel.findByIdAndUpdate(
      id,
      { ...template, history },
      { new: true }
    );
  }

  async deleteTemplate(id: string) {
    return this.templateModel.findByIdAndDelete(id);
  }

  // Settings Methods
  async getEmailSettings() {
    const settings = await this.settingsModel.findOne({ type: 'email' });
    if (!settings) {
      // Erstelle Standardeinstellungen aus der Konfiguration
      return this.createDefaultEmailSettings();
    }
    return settings;
  }

  async updateEmailSettings(settings: any, userEmail: string) {
    const existingSettings = await this.settingsModel.findOne({ type: 'email' });
    if (existingSettings) {
      return this.settingsModel.findByIdAndUpdate(
        existingSettings._id,
        {
          ...settings,
          lastModifiedBy: userEmail,
          lastModifiedAt: new Date(),
        },
        { new: true }
      );
    }
    return this.settingsModel.create({
      ...settings,
      type: 'email',
      lastModifiedBy: userEmail,
      lastModifiedAt: new Date(),
    });
  }

  async sendTestEmail(templateId: string, testData: any, userEmail: string) {
    const template = await this.templateModel.findById(templateId);
    if (!template) {
      throw new NotFoundException('Template nicht gefunden');
    }

    return this.emailService.sendEmail({
      to: userEmail,
      subject: template.subject,
      template: template.content,
      data: testData,
    });
  }

  private async createDefaultEmailSettings() {
    return this.settingsModel.create({
      type: 'email',
      smtp: {
        host: this.configService.get('email.smtp.host'),
        port: this.configService.get('email.smtp.port'),
        secure: this.configService.get('email.smtp.secure'),
        user: this.configService.get('email.smtp.user'),
        pass: this.configService.get('email.smtp.pass'),
      },
      sender: {
        name: this.configService.get('email.defaults.from.name'),
        email: this.configService.get('email.defaults.from.address'),
      },
      company: {
        name: this.configService.get('email.company.name'),
        address: this.configService.get('email.company.address'),
        logo: this.configService.get('email.company.logo'),
        support: {
          email: this.configService.get('email.company.support.email'),
          phone: this.configService.get('email.company.support.phone'),
        },
      },
    });
  }
} 