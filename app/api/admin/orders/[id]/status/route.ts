import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { OrderStatus } from '@prisma/client';
import { sendEmail, emailTemplates } from '@/lib/email';

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const body = await request.json();
    const { status } = body as { status: OrderStatus };

    if (!status) {
      return new NextResponse('Status is required', { status: 400 });
    }

    const updatedOrder = await prisma.order.update({
      where: { id: params.id },
      data: { status },
      include: {
        user: {
          select: {
            email: true,
            name: true,
          },
        },
      },
    });

    // E-Mail-Benachrichtigung an den Kunden senden
    if (updatedOrder.user.email) {
      const statusMessages = {
        processing: 'Ihre Bestellung wird bearbeitet.',
        shipped: 'Ihre Bestellung wurde versendet.',
        delivered: 'Ihre Bestellung wurde zugestellt.',
        cancelled: 'Ihre Bestellung wurde storniert.',
      };

      const message = statusMessages[status as keyof typeof statusMessages];
      if (message) {
        await sendEmail({
          to: updatedOrder.user.email,
          subject: `Bestellstatus aktualisiert: ${message}`,
          html: `
            <div style="font-family: sans-serif;">
              <h2>Hallo ${updatedOrder.user.name},</h2>
              <p>${message}</p>
              <p>Bestellnummer: ${updatedOrder.orderNumber}</p>
              <p>Mit freundlichen Grüßen<br>Ihr Shop-Team</p>
            </div>
          `,
        });
      }
    }

    return NextResponse.json(updatedOrder);
  } catch (error) {
    console.error('Order Status Update Error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
} 