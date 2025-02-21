import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user || session.user.role !== 'admin') {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    const activities = await prisma.userActivity.findMany({
      take: 50, // Begrenzen auf die letzten 50 Aktivitäten
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        user: {
          select: {
            name: true,
          },
        },
      },
    });

    // Formatiere die Aktivitäten für die Frontend-Anzeige
    const formattedActivities = activities.map((activity) => ({
      id: activity.id,
      userId: activity.userId,
      userName: activity.user.name,
      type: activity.type,
      description: activity.description,
      createdAt: activity.createdAt,
      metadata: activity.metadata,
    }));

    return NextResponse.json(formattedActivities);
  } catch (error) {
    console.error('Activities Error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user || session.user.role !== 'admin') {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    const body = await request.json();
    const { userId, type, description, metadata } = body;

    const activity = await prisma.userActivity.create({
      data: {
        userId,
        type,
        description,
        metadata,
      },
    });

    return NextResponse.json(activity);
  } catch (error) {
    console.error('Create Activity Error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
} 