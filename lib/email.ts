import { Resend } from 'resend';
import { createTransport } from 'nodemailer'
import { render } from '@react-email/render'
import OrderConfirmationEmail from '@/emails/OrderConfirmationEmail'

const resend = new Resend(process.env.RESEND_API_KEY);

const transporter = createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
})

interface EmailOptions {
  to: string;
  subject: string;
  text?: string;
  html?: string;
}

export async function sendEmail({ to, subject, text, html }: EmailOptions) {
  try {
    const { data, error } = await resend.emails.send({
      from: process.env.EMAIL_FROM || 'noreply@example.com',
      to,
      subject,
      text,
      html: html || text?.replace(/\n/g, '<br>'),
    });

    if (error) {
      console.error('Email Error:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Email Send Error:', error);
    throw error;
  }
}

export const emailTemplates = {
  tradeInStatusUpdate: (status: string, message: string) => ({
    subject: `Status-Update: ${status}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1a365d;">Status-Update zu Ihrer Ankaufsanfrage</h2>
        <p style="color: #4a5568; line-height: 1.5;">${message}</p>
        <div style="margin-top: 24px; padding-top: 24px; border-top: 1px solid #e2e8f0;">
          <p style="color: #718096; font-size: 14px;">
            Mit freundlichen Grüßen<br>
            Ihr Support-Team
          </p>
        </div>
      </div>
    `,
  }),

  newMessage: (requestId: string, preview: string) => ({
    subject: 'Neue Nachricht zu Ihrer Ankaufsanfrage',
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1a365d;">Neue Nachricht</h2>
        <p style="color: #4a5568; line-height: 1.5;">
          Sie haben eine neue Nachricht zu Ihrer Ankaufsanfrage erhalten.
        </p>
        <p style="color: #4a5568; line-height: 1.5;">
          "${preview.substring(0, 100)}${preview.length > 100 ? '...' : ''}"
        </p>
        <a href="${process.env.NEXTAUTH_URL}/trade-in/${requestId}"
           style="display: inline-block; background-color: #3182ce; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin-top: 16px;">
          Zur Anfrage
        </a>
      </div>
    `,
  }),
};

interface SendOrderConfirmationProps {
  to: string
  order: any
}

export async function sendOrderConfirmation({ to, order }: SendOrderConfirmationProps) {
  const html = render(OrderConfirmationEmail({ order }))

  await transporter.sendMail({
    from: process.env.MAIL_FROM,
    to,
    subject: `Bestellbestätigung #${order.id}`,
    html,
  })
} 