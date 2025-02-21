import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user || session.user.role !== 'admin') {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const level = searchParams.get('level');

  try {
    const logs = await prisma.systemLog.findMany({
      where: level && level !== 'all' ? {
        level: level as 'info' | 'warning' | 'error',
      } : undefined,
      orderBy: {
        createdAt: 'desc',
      },
      take: 100, // Begrenzen auf die letzten 100 Logs
    });

    return NextResponse.json(logs);
  } catch (error) {
    console.error('Logs Error:', error);
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
    const { level, message, source, metadata } = body;

    const log = await prisma.systemLog.create({
      data: {
        level,
        message,
        source,
        metadata,
      },
    });

    return NextResponse.json(log);
  } catch (error) {
    console.error('Create Log Error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
} 