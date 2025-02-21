import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);

  if (!session?.user || session.user.role !== 'admin') {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    const tradeIn = await prisma.tradeIn.findUnique({
      where: {
        id: params.id,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        images: {
          select: {
            url: true,
          },
        },
      },
    });

    if (!tradeIn) {
      return new NextResponse('Trade-In not found', { status: 404 });
    }

    // Formatiere die Bilder-URLs in ein einfacheres Array
    const formattedTradeIn = {
      ...tradeIn,
      images: tradeIn.images.map(img => img.url),
    };

    return NextResponse.json(formattedTradeIn);
  } catch (error) {
    console.error('Trade-In Details Error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);

  if (!session?.user || session.user.role !== 'admin') {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    const body = await request.json();
    const { status, offeredPrice, adminNote } = body;

    const updateData: any = {
      status,
    };

    // Füge optionale Felder hinzu, wenn sie vorhanden sind
    if (offeredPrice !== undefined) {
      updateData.offeredPrice = offeredPrice;
    }

    if (adminNote !== undefined) {
      updateData.adminNote = adminNote;
    }

    // Wenn der Status auf "offered" gesetzt wird, stelle sicher, dass ein Preis angegeben wurde
    if (status === 'offered' && !offeredPrice) {
      return new NextResponse(
        'An offer price is required when setting status to offered',
        { status: 400 }
      );
    }

    const updatedTradeIn = await prisma.tradeIn.update({
      where: {
        id: params.id,
      },
      data: updateData,
    });

    // Sende eine E-Mail-Benachrichtigung, wenn ein Angebot erstellt wurde
    if (status === 'offered') {
      // Hier könnte die E-Mail-Benachrichtigung implementiert werden
      // await sendTradeInOfferEmail(updatedTradeIn);
    }

    return NextResponse.json(updatedTradeIn);
  } catch (error) {
    console.error('Update Trade-In Error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
} 