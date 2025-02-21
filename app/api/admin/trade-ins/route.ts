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
  const status = searchParams.get('status');

  try {
    const tradeIns = await prisma.tradeIn.findMany({
      where: status && status !== 'all' ? {
        status: status,
      } : undefined,
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json(tradeIns);
  } catch (error) {
    console.error('Trade-Ins Error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
} 