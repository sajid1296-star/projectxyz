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

    const tradeInRequests = await prisma.tradeInRequest.findMany({
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

    return NextResponse.json(tradeInRequests);
  } catch (error) {
    console.error('Admin Trade-in Error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
} 