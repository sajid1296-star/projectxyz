import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const users = await prisma.user.findMany({
      where: {
        role: 'USER',
      },
      include: {
        orders: {
          select: {
            id: true,
            totalAmount: true,
          },
        },
        tradeInRequests: {
          select: {
            id: true,
            status: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json(users);
  } catch (error) {
    console.error('Users Error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
} 