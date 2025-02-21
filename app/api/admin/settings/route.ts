import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const settings = await prisma.settings.findFirst();
    return NextResponse.json(settings);
  } catch (error) {
    console.error('Settings Error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const body = await request.json();
    const { siteName, contactEmail, orderNotifications, tradeInNotifications, maintenanceMode } = body;

    const settings = await prisma.settings.upsert({
      where: {
        id: 1, // Assuming single settings record
      },
      update: {
        siteName,
        contactEmail,
        orderNotifications,
        tradeInNotifications,
        maintenanceMode,
      },
      create: {
        siteName,
        contactEmail,
        orderNotifications,
        tradeInNotifications,
        maintenanceMode,
      },
    });

    return NextResponse.json(settings);
  } catch (error) {
    console.error('Settings Update Error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
} 