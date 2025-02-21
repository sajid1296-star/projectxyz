import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { uploadToS3 } from '@/lib/s3';

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const body = await request.json();
    const {
      deviceType,
      brand,
      model,
      condition,
      storage,
      color,
      description,
      images
    } = body;

    // Basis-Validierung
    if (!deviceType || !brand || !model || !condition || images.length === 0) {
      return new NextResponse('Fehlende Pflichtfelder', { status: 400 });
    }

    // Preisschätzung abrufen
    const estimationResponse = await fetch(`${process.env.API_URL}/api/trade-in/estimate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!estimationResponse.ok) {
      throw new Error('Fehler bei der Preisschätzung');
    }

    const { estimatedPrice } = await estimationResponse.json();

    // Trade-in Anfrage erstellen
    const tradeInRequest = await prisma.tradeInRequest.create({
      data: {
        userId: session.user.id,
        deviceType,
        brand,
        model,
        condition,
        storage,
        color,
        description,
        originalPrice: estimatedPrice,
        offeredPrice: estimatedPrice,
        images: {
          create: images.map((url: string) => ({
            url
          }))
        }
      },
    });

    // Benachrichtigung an Admins senden (optional)
    // await notifyAdmins(tradeInRequest.id);

    return NextResponse.json(tradeInRequest);
  } catch (error) {
    console.error('Trade-in Error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');

  try {
    const tradeIns = await prisma.tradeIn.findMany({
      where: {
        userId: session.user.id,
        ...(status && { status }),
      },
      include: {
        model: {
          include: {
            brand: true,
          },
        },
        images: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json(tradeIns);
  } catch (error) {
    console.error('Trade-Ins Error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
} 