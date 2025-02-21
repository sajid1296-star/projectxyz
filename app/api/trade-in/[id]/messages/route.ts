import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const body = await request.json();
    const { message } = body;

    if (!message?.trim()) {
      return new NextResponse('Message is required', { status: 400 });
    }

    // Überprüfen, ob der Benutzer Zugriff auf diese Anfrage hat
    const tradeInRequest = await prisma.tradeInRequest.findUnique({
      where: { id: params.id },
      select: { userId: true },
    });

    if (!tradeInRequest) {
      return new NextResponse('Trade-in request not found', { status: 404 });
    }

    // Nur Admin oder der Besitzer der Anfrage darf Nachrichten senden
    if (session.user.role !== 'ADMIN' && tradeInRequest.userId !== session.user.id) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const newMessage = await prisma.tradeInMessage.create({
      data: {
        requestId: params.id,
        userId: session.user.id,
        message,
        isAdmin: session.user.role === 'ADMIN',
      },
    });

    // Optional: Benachrichtigung an den anderen Teilnehmer senden
    if (session.user.role === 'ADMIN') {
      // Kunde benachrichtigen
      // await notifyUser(tradeInRequest.userId, 'Neue Nachricht vom Support');
    } else {
      // Admin benachrichtigen
      // await notifyAdmins('Neue Kundenanfrage');
    }

    return NextResponse.json(newMessage);
  } catch (error) {
    console.error('Message Error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    // Überprüfen, ob der Benutzer Zugriff auf diese Anfrage hat
    const tradeInRequest = await prisma.tradeInRequest.findUnique({
      where: { id: params.id },
      select: { userId: true },
    });

    if (!tradeInRequest) {
      return new NextResponse('Trade-in request not found', { status: 404 });
    }

    if (session.user.role !== 'ADMIN' && tradeInRequest.userId !== session.user.id) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const messages = await prisma.tradeInMessage.findMany({
      where: {
        requestId: params.id,
      },
      orderBy: {
        createdAt: 'asc',
      },
      include: {
        user: {
          select: {
            name: true,
          },
        },
      },
    });

    return NextResponse.json(messages);
  } catch (error) {
    console.error('Messages Error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
} 