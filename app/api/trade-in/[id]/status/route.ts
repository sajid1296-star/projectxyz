import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { TradeInStatus } from '@prisma/client';

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
    const { status } = body as { status: TradeInStatus };

    if (!status) {
      return new NextResponse('Status is required', { status: 400 });
    }

    const updatedRequest = await prisma.tradeInRequest.update({
      where: { id: params.id },
      data: { status },
      include: {
        user: {
          select: {
            email: true,
          },
        },
      },
    });

    // E-Mail-Benachrichtigung an den Kunden senden
    if (updatedRequest.user.email) {
      const statusMessages = {
        reviewing: 'Ihre Ankaufsanfrage wird nun geprüft.',
        offerMade: 'Wir haben Ihnen ein Angebot erstellt.',
        accepted: 'Ihre Annahme wurde bestätigt.',
        rejected: 'Ihre Anfrage wurde leider abgelehnt.',
        deviceReceived: 'Wir haben Ihr Gerät erhalten.',
        completed: 'Der Ankauf wurde erfolgreich abgeschlossen.',
        cancelled: 'Die Anfrage wurde storniert.',
      };

      const message = statusMessages[status];
      if (message) {
        // await sendEmail({
        //   to: updatedRequest.user.email,
        //   subject: `Status-Update: ${message}`,
        //   text: `Sehr geehrte(r) Kunde(in),\n\n${message}\n\nMit freundlichen Grüßen\nIhr Support-Team`
        // });
      }
    }

    return NextResponse.json(updatedRequest);
  } catch (error) {
    console.error('Status Update Error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
} 