import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import * as Handlebars from 'handlebars';
import { tradeInHTMLTemplate } from './templates/trade-in-status.html';

@Injectable()
export class EmailService {
  private transporter;
  private compiledBaseTemplate;

  constructor(private configService: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.configService.get('SMTP_HOST'),
      port: this.configService.get('SMTP_PORT'),
      secure: true,
      auth: {
        user: this.configService.get('SMTP_USER'),
        pass: this.configService.get('SMTP_PASS'),
      },
    });

    // Kompiliere das Basis-Template beim Start
    this.compiledBaseTemplate = Handlebars.compile(tradeInHTMLTemplate.baseLayout);

    // Registriere Handlebars Helfer
    Handlebars.registerHelper('formatDate', function(date) {
      return new Date(date).toLocaleDateString('de-DE');
    });

    Handlebars.registerHelper('formatPrice', function(price) {
      return new Intl.NumberFormat('de-DE', {
        style: 'currency',
        currency: 'EUR'
      }).format(price);
    });

    Handlebars.registerHelper('statusColor', function(status) {
      const colors = {
        pending: '#f8f9fa',
        approved: '#d4edda',
        received: '#cce5ff',
        inspected: '#fff3cd',
        completed: '#d4edda',
        rejected: '#f8d7da'
      };
      return colors[status] || '#f8f9fa';
    });
  }

  async sendOrderStatusUpdate(
    email: string,
    orderId: string,
    status: string,
    trackingNumber?: string
  ) {
    const statusLabels = {
      paid: 'bezahlt',
      processing: 'in Bearbeitung',
      shipped: 'versendet',
      delivered: 'zugestellt',
      cancelled: 'storniert',
    };

    const subject = `Bestellstatus-Update für Bestellung ${orderId}`;
    let text = `Ihre Bestellung ${orderId} ist jetzt ${statusLabels[status]}.`;

    if (trackingNumber) {
      text += `\n\nIhre Sendungsnummer lautet: ${trackingNumber}`;
    }

    await this.transporter.sendMail({
      from: this.configService.get('MAIL_FROM'),
      to: email,
      subject,
      text,
    });
  }

  async sendTradeInStatusUpdate(
    email: string,
    tradeInId: string,
    status: string,
    data: {
      firstName: string;
      lastName: string;
      deviceType?: string;
      brand?: string;
      model?: string;
      estimatedPrice?: number;
      finalPrice?: number;
      condition?: string;
      notes?: string;
      trackingNumber?: string;
      rejectionReason?: string;
    }
  ) {
    const template = tradeInHTMLTemplate[status];
    if (!template) {
      throw new Error(`Kein Template für Status ${status} gefunden`);
    }

    // Kompiliere den Content-Teil
    const compiledContent = Handlebars.compile(template.content);

    // Bereite die Daten für das Template vor
    const templateData = {
      ...data,
      tradeInId,
      subject: template.subject,
      companyName: this.configService.get('COMPANY_NAME'),
      companyAddress: this.configService.get('COMPANY_ADDRESS'),
      logoUrl: this.configService.get('COMPANY_LOGO_URL'),
      dashboardUrl: `${this.configService.get('FRONTEND_URL')}/account/trade-in`,
      supportUrl: `${this.configService.get('FRONTEND_URL')}/support`,
      currentYear: new Date().getFullYear()
    };

    // Generiere zuerst den Content
    const content = compiledContent(templateData);

    // Füge den Content in das Basis-Layout ein
    const html = this.compiledBaseTemplate({
      ...templateData,
      content
    });

    try {
      await this.transporter.sendMail({
        from: {
          name: this.configService.get('COMPANY_NAME'),
          address: this.configService.get('MAIL_FROM')
        },
        to: email,
        subject: template.subject,
        html,
        text: this.generatePlainText(content), // Fallback Plain-Text-Version
      });

      // Logging für erfolgreichen Versand
      console.log(`E-Mail für Trade-In ${tradeInId} (Status: ${status}) an ${email} gesendet`);
    } catch (error) {
      console.error(`Fehler beim E-Mail-Versand für Trade-In ${tradeInId}:`, error);
      throw new Error('E-Mail konnte nicht gesendet werden');
    }
  }

  async sendTradeInReminder(
    email: string,
    tradeInId: string,
    data: {
      firstName: string;
      lastName: string;
      daysInactive: number;
      deviceType: string;
      estimatedPrice: number;
    }
  ) {
    const reminderTemplate = `
      <h2>Erinnerung: Ihre Ankauf-Anfrage wartet auf Ihre Bestätigung</h2>
      <p>Sehr geehrte(r) {{firstName}} {{lastName}},</p>
      
      <div class="info-box">
        <p>Ihre Ankauf-Anfrage (ID: {{tradeInId}}) für ein {{deviceType}} 
        mit einem geschätzten Wert von {{formatPrice estimatedPrice}} 
        wartet seit {{daysInactive}} Tagen auf Ihre Bestätigung.</p>
      </div>

      <p>Bitte loggen Sie sich in Ihr Kundenkonto ein und schließen Sie den Prozess ab.</p>
      
      <a href="{{dashboardUrl}}" class="button">Jetzt bestätigen</a>
    `;

    const compiledReminder = Handlebars.compile(reminderTemplate);
    const templateData = {
      ...data,
      tradeInId,
      subject: 'Erinnerung: Ankauf-Anfrage wartet auf Ihre Bestätigung',
      companyName: this.configService.get('COMPANY_NAME'),
      companyAddress: this.configService.get('COMPANY_ADDRESS'),
      logoUrl: this.configService.get('COMPANY_LOGO_URL'),
      dashboardUrl: `${this.configService.get('FRONTEND_URL')}/account/trade-in`,
      currentYear: new Date().getFullYear()
    };

    const content = compiledReminder(templateData);
    const html = this.compiledBaseTemplate({
      ...templateData,
      content
    });

    await this.transporter.sendMail({
      from: {
        name: this.configService.get('COMPANY_NAME'),
        address: this.configService.get('MAIL_FROM')
      },
      to: email,
      subject: 'Erinnerung: Ankauf-Anfrage wartet auf Ihre Bestätigung',
      html,
      text: this.generatePlainText(content),
    });
  }

  private generatePlainText(html: string): string {
    // Einfache HTML zu Text Konvertierung
    return html
      .replace(/<style[^>]*>.*?<\/style>/gs, '')
      .replace(/<[^>]+>/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }
} 