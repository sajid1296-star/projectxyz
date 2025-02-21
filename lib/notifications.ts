import { sendEmail, emailTemplates } from './email';
import prisma from './prisma';

export async function notifyUser(userId: string, message: string, requestId?: string) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });

    if (!user?.email) return;

    const emailTemplate = requestId
      ? emailTemplates.newMessage(requestId, message)
      : {
          subject: 'Neue Benachrichtigung',
          html: `
            <div style="font-family: sans-serif;">
              <p>${message}</p>
            </div>
          `,
        };

    await sendEmail({
      to: user.email,
      ...emailTemplate,
    });
  } catch (error) {
    console.error('User Notification Error:', error);
  }
}

export async function notifyAdmins(message: string, requestId?: string) {
  try {
    const admins = await prisma.user.findMany({
      where: { role: 'ADMIN' },
      select: { email: true },
    });

    const adminEmails = admins
      .map(admin => admin.email)
      .filter((email): email is string => email !== null);

    if (adminEmails.length === 0) return;

    const emailTemplate = requestId
      ? emailTemplates.newMessage(requestId, message)
      : {
          subject: 'Neue Admin-Benachrichtigung',
          html: `
            <div style="font-family: sans-serif;">
              <p>${message}</p>
            </div>
          `,
        };

    await Promise.all(
      adminEmails.map(email =>
        sendEmail({
          to: email,
          ...emailTemplate,
        })
      )
    );
  } catch (error) {
    console.error('Admin Notification Error:', error);
  }
} 