import { Redis } from 'ioredis'
import { prisma } from '../prisma'
import { LoggingService } from '../logger'
import { QueueService } from '../queue'
import { I18nService } from '../i18n'
import { PerformanceService } from '../performance'
import { SNS, SES } from 'aws-sdk'
import { Twilio } from 'twilio'
import { Expo } from 'expo-server-sdk'
import { Slack } from '@slack/web-api'
import { Discord } from 'discord.js'
import { Telegram } from 'telegraf'
import { FCM } from 'firebase-admin'
import { WebSocket } from 'ws'

const logger = new LoggingService()
const queue = new QueueService()
const i18n = new I18nService()
const performance = new PerformanceService()
const redis = new Redis(process.env.REDIS_URL!)

// Notification Providers
const sns = new SNS({ region: process.env.AWS_REGION })
const ses = new SES({ region: process.env.AWS_REGION })
const twilio = new Twilio(
  process.env.TWILIO_SID!,
  process.env.TWILIO_TOKEN!
)
const expo = new Expo()
const slack = new Slack({ token: process.env.SLACK_TOKEN })
const discord = new Discord.Client()
const telegram = new Telegram(process.env.TELEGRAM_TOKEN!)
const fcm = FCM.initializeApp()

// WebSocket Server
const wss = new WebSocket.Server({ port: 8080 })
const clients = new Map<string, WebSocket>()

export class NotificationService {
  async send(notification: {
    type: string
    recipients: Array<{
      id: string
      channels: Array<
        'email' | 'sms' | 'push' | 'slack' | 'discord' |
        'telegram' | 'websocket'
      >
      language?: string
    }>
    template: string
    data: any
    priority?: 'high' | 'normal' | 'low'
    scheduling?: {
      sendAt?: Date
      timezone?: string
      batch?: boolean
    }
  }) {
    try {
      const {
        type,
        recipients,
        template,
        data,
        priority = 'normal',
        scheduling
      } = notification

      // Notification validieren
      this.validateNotification(notification)

      // Batch Processing
      if (scheduling?.batch) {
        return this.batchNotifications(notification)
      }

      // Scheduled Notifications
      if (scheduling?.sendAt) {
        return this.scheduleNotification(
          notification,
          scheduling.sendAt
        )
      }

      // Notifications für jeden Empfänger erstellen
      const notifications = await Promise.all(
        recipients.map(async recipient => {
          // User Preferences laden
          const preferences = await this.getUserPreferences(
            recipient.id
          )

          // Channels filtern
          const enabledChannels = recipient.channels.filter(
            channel => preferences[channel]
          )

          // Template für jeden Channel rendern
          const renderedTemplates = await this.renderTemplates(
            template,
            data,
            recipient.language || 'en',
            enabledChannels
          )

          // Notifications senden
          return Promise.all(
            enabledChannels.map(async channel => {
              const notificationData = {
                recipientId: recipient.id,
                channel,
                type,
                template: renderedTemplates[channel],
                data,
                status: 'pending',
                priority,
                createdAt: new Date()
              }

              // In DB speichern
              const notification = await prisma.notification.create({
                data: notificationData
              })

              // An Queue senden
              await queue.addJob(
                'send_notification',
                {
                  notificationId: notification.id,
                  channel,
                  recipient,
                  content: renderedTemplates[channel],
                  data
                },
                { priority }
              )

              return notification
            })
          )
        })
      )

      // Metriken tracken
      await performance.trackMetric({
        name: 'notifications_sent',
        value: notifications.flat().length,
        type: 'counter',
        labels: { type }
      })

      return notifications.flat()
    } catch (error) {
      logger.log('error', 'Notification sending failed', { error })
      throw error
    }
  }

  async getNotificationStatus(notificationId: string) {
    try {
      const notification = await prisma.notification.findUnique({
        where: { id: notificationId }
      })
      return notification?.status || 'not_found'
    } catch (error) {
      logger.log('error', 'Status check failed', { error })
      throw error
    }
  }

  private async sendEmail(
    recipient: any,
    content: string,
    data: any
  ) {
    await ses.sendEmail({
      Source: process.env.EMAIL_FROM!,
      Destination: {
        ToAddresses: [recipient.email]
      },
      Message: {
        Subject: { Data: content.subject },
        Body: {
          Html: { Data: content.html },
          Text: { Data: content.text }
        }
      }
    }).promise()
  }

  private async sendSMS(
    recipient: any,
    content: string,
    data: any
  ) {
    await twilio.messages.create({
      to: recipient.phone,
      from: process.env.TWILIO_PHONE,
      body: content
    })
  }

  private async sendPushNotification(
    recipient: any,
    content: any,
    data: any
  ) {
    if (Expo.isExpoPushToken(recipient.pushToken)) {
      await expo.sendPushNotificationsAsync([{
        to: recipient.pushToken,
        sound: 'default',
        title: content.title,
        body: content.body,
        data
      }])
    } else {
      await fcm.messaging().send({
        token: recipient.pushToken,
        notification: {
          title: content.title,
          body: content.body
        },
        data
      })
    }
  }

  private async sendSlackMessage(
    recipient: any,
    content: string,
    data: any
  ) {
    await slack.chat.postMessage({
      channel: recipient.slackId,
      text: content,
      blocks: data.blocks
    })
  }

  private async sendDiscordMessage(
    recipient: any,
    content: string,
    data: any
  ) {
    const channel = await discord.channels.fetch(
      recipient.discordChannelId
    )
    if (channel?.isText()) {
      await channel.send(content)
    }
  }

  private async sendTelegramMessage(
    recipient: any,
    content: string,
    data: any
  ) {
    await telegram.sendMessage(
      recipient.telegramId,
      content,
      data.options
    )
  }

  private async sendWebSocketMessage(
    recipient: any,
    content: any,
    data: any
  ) {
    const client = clients.get(recipient.id)
    if (client?.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({
        type: 'notification',
        content,
        data
      }))
    }
  }

  private validateNotification(notification: any) {
    // Validation Logik implementieren
  }

  private async getUserPreferences(
    userId: string
  ): Promise<Record<string, boolean>> {
    const preferences = await prisma.notificationPreferences.findUnique({
      where: { userId }
    })
    return preferences?.channels || {}
  }

  private async renderTemplates(
    template: string,
    data: any,
    language: string,
    channels: string[]
  ) {
    const templates: Record<string, any> = {}

    for (const channel of channels) {
      const templateKey = `${template}.${channel}`
      const translated = await i18n.translate(
        templateKey,
        language,
        data
      )
      templates[channel] = translated
    }

    return templates
  }

  private async batchNotifications(notification: any) {
    // Batch Processing Logik implementieren
  }

  private async scheduleNotification(
    notification: any,
    sendAt: Date
  ) {
    // Scheduling Logik implementieren
  }
} 