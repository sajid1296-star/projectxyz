import { SES, S3 } from 'aws-sdk'
import { createTransport } from 'nodemailer'
import { Redis } from 'ioredis'
import { prisma } from '../prisma'
import { LoggerService } from '../logger'
import { QueueService } from '../queue'
import { I18nService } from '../i18n'
import { render } from '@react-email/render'
import Handlebars from 'handlebars'
import mjml2html from 'mjml'
import * as EmailTemplates from './templates'

const logger = new LoggerService()
const queue = new QueueService()
const i18n = new I18nService()
const redis = new Redis(process.env.REDIS_URL!)

// AWS Services
const ses = new SES({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!
  }
})

const s3 = new S3({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!
  }
})

// SMTP Fallback
const smtp = createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT!),
  secure: true,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
})

export class EmailService {
  async send(options: {
    to: string | string[]
    template: keyof typeof EmailTemplates
    data: any
    attachments?: Array<{
      filename: string
      path: string
    }>
    priority?: 'high' | 'normal' | 'low'
    language?: string
    trackingId?: string
  }) {
    try {
      const {
        to,
        template,
        data,
        attachments = [],
        priority = 'normal',
        language = 'en',
        trackingId
      } = options

      // Email in DB speichern
      const email = await prisma.email.create({
        data: {
          to: Array.isArray(to) ? to.join(',') : to,
          template,
          data,
          status: 'QUEUED',
          priority,
          language,
          trackingId
        }
      })

      // Template laden und übersetzen
      const Template = EmailTemplates[template]
      const translatedData = await this.translateEmailData(
        data,
        language
      )

      // HTML generieren
      const mjmlTemplate = render(<Template {...translatedData} />)
      const { html } = mjml2html(mjmlTemplate)

      // Text-Version generieren
      const text = this.generateTextVersion(html)

      // Tracking-Pixel und Links
      const { 
        processedHtml,
        trackingLinks
      } = await this.addTracking(html, email.id)

      // Attachments verarbeiten
      const processedAttachments = await this.processAttachments(
        attachments
      )

      // Email versenden
      const result = await this.sendEmail({
        to,
        html: processedHtml,
        text,
        attachments: processedAttachments,
        priority
      })

      // Status aktualisieren
      await prisma.email.update({
        where: { id: email.id },
        data: {
          status: 'SENT',
          provider: result.provider,
          providerMessageId: result.messageId,
          trackingLinks
        }
      })

      // Analytics aktualisieren
      await this.updateAnalytics(email.id, 'sent')

      return email
    } catch (error) {
      logger.log('error', 'Email sending failed', { error })
      throw error
    }
  }

  async handleBounce(event: any) {
    try {
      const { messageId, reason } = this.parseBounceEvent(event)

      await prisma.email.update({
        where: { providerMessageId: messageId },
        data: {
          status: 'BOUNCED',
          error: reason
        }
      })

      await this.updateAnalytics(messageId, 'bounced')
    } catch (error) {
      logger.log('error', 'Bounce handling failed', { error })
    }
  }

  async handleComplaint(event: any) {
    try {
      const { messageId, reason } = this.parseComplaintEvent(event)

      await prisma.email.update({
        where: { providerMessageId: messageId },
        data: {
          status: 'COMPLAINED',
          error: reason
        }
      })

      await this.updateAnalytics(messageId, 'complained')
    } catch (error) {
      logger.log('error', 'Complaint handling failed', { error })
    }
  }

  async trackOpen(emailId: string, metadata: any = {}) {
    try {
      await prisma.emailEvent.create({
        data: {
          emailId,
          type: 'OPEN',
          metadata
        }
      })

      await this.updateAnalytics(emailId, 'opened')
    } catch (error) {
      logger.log('error', 'Open tracking failed', { error })
    }
  }

  async trackClick(emailId: string, linkId: string, metadata: any = {}) {
    try {
      await prisma.emailEvent.create({
        data: {
          emailId,
          type: 'CLICK',
          metadata: {
            linkId,
            ...metadata
          }
        }
      })

      await this.updateAnalytics(emailId, 'clicked')
    } catch (error) {
      logger.log('error', 'Click tracking failed', { error })
    }
  }

  private async sendEmail(options: any) {
    try {
      // Zuerst mit SES versuchen
      const result = await ses.sendEmail({
        Destination: {
          ToAddresses: Array.isArray(options.to)
            ? options.to
            : [options.to]
        },
        Message: {
          Body: {
            Html: { Data: options.html },
            Text: { Data: options.text }
          },
          Subject: { Data: options.subject }
        },
        Source: process.env.EMAIL_FROM!
      }).promise()

      return {
        provider: 'ses',
        messageId: result.MessageId
      }
    } catch (error) {
      // Fallback zu SMTP
      const result = await smtp.sendMail({
        from: process.env.EMAIL_FROM,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
        attachments: options.attachments
      })

      return {
        provider: 'smtp',
        messageId: result.messageId
      }
    }
  }

  private async translateEmailData(data: any, language: string) {
    // Rekursive Übersetzung aller Strings
    const translate = async (obj: any): Promise<any> => {
      if (typeof obj === 'string') {
        return i18n.translate(obj, language)
      }
      if (Array.isArray(obj)) {
        return Promise.all(obj.map(translate))
      }
      if (typeof obj === 'object') {
        const result: any = {}
        for (const [key, value] of Object.entries(obj)) {
          result[key] = await translate(value)
        }
        return result
      }
      return obj
    }

    return translate(data)
  }

  private generateTextVersion(html: string): string {
    // HTML zu Text konvertieren
    return html
      .replace(/<style[^>]*>.*?<\/style>/gs, '')
      .replace(/<[^>]+>/g, '')
      .replace(/\s+/g, ' ')
      .trim()
  }

  private async addTracking(
    html: string,
    emailId: string
  ) {
    const trackingLinks: Record<string, string> = {}
    let processedHtml = html

    // Tracking-Pixel hinzufügen
    processedHtml += `
      <img src="${process.env.API_URL}/api/email/track/open/${emailId}" 
      width="1" height="1" />
    `

    // Links mit Tracking versehen
    processedHtml = processedHtml.replace(
      /href="([^"]+)"/g,
      (match, url) => {
        const linkId = this.generateLinkId()
        trackingLinks[linkId] = url
        return `href="${process.env.API_URL}/api/email/track/click/${emailId}/${linkId}"`
      }
    )

    return { processedHtml, trackingLinks }
  }

  private async processAttachments(
    attachments: Array<{
      filename: string
      path: string
    }>
  ) {
    return Promise.all(
      attachments.map(async attachment => {
        if (attachment.path.startsWith('s3://')) {
          const key = attachment.path.replace('s3://', '')
          const file = await s3
            .getObject({ Bucket: 'attachments', Key: key })
            .promise()

          return {
            filename: attachment.filename,
            content: file.Body
          }
        }
        return attachment
      })
    )
  }

  private generateLinkId(): string {
    return Math.random().toString(36).substr(2, 9)
  }

  private parseBounceEvent(event: any) {
    // Bounce-Event parsen
    return {
      messageId: '',
      reason: ''
    }
  }

  private parseComplaintEvent(event: any) {
    // Complaint-Event parsen
    return {
      messageId: '',
      reason: ''
    }
  }

  private async updateAnalytics(
    emailId: string,
    event: string
  ) {
    // Analytics aktualisieren
  }
} 