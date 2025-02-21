import {
  Controller,
  Get,
  Put,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  NotFoundException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { SettingsService } from './settings.service';
import { User } from '../../auth/decorators/user.decorator';

@Controller('admin/settings')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('admin')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  // Template Endpoints
  @Get('templates')
  async getAllTemplates() {
    return this.settingsService.getAllTemplates();
  }

  @Get('templates/:id')
  async getTemplate(@Param('id') id: string) {
    const template = await this.settingsService.getTemplateById(id);
    if (!template) {
      throw new NotFoundException('Template nicht gefunden');
    }
    return template;
  }

  @Post('templates')
  async createTemplate(
    @Body() template: any,
    @User() user: any
  ) {
    return this.settingsService.createTemplate({
      ...template,
      lastModifiedBy: user.email,
    });
  }

  @Put('templates/:id')
  async updateTemplate(
    @Param('id') id: string,
    @Body() template: any,
    @User() user: any
  ) {
    return this.settingsService.updateTemplate(id, {
      ...template,
      lastModifiedBy: user.email,
    });
  }

  @Delete('templates/:id')
  async deleteTemplate(@Param('id') id: string) {
    return this.settingsService.deleteTemplate(id);
  }

  // Settings Endpoints
  @Get('email')
  async getEmailSettings() {
    return this.settingsService.getEmailSettings();
  }

  @Put('email')
  async updateEmailSettings(
    @Body() settings: any,
    @User() user: any
  ) {
    return this.settingsService.updateEmailSettings(settings, user.email);
  }

  @Post('email/test')
  async sendTestEmail(
    @Body() data: { templateId: string; testData: any },
    @User() user: any
  ) {
    return this.settingsService.sendTestEmail(
      data.templateId,
      data.testData,
      user.email
    );
  }
} 