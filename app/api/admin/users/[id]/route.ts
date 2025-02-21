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
    const user = await prisma.user.findUnique({
      where: {
        id: params.id,
      },
      include: {
        orders: {
          orderBy: {
            createdAt: 'desc',
          },
          select: {
            id: true,
            createdAt: true,
            status: true,
            total: true,
          },
        },
        tradeIns: {
          orderBy: {
            createdAt: 'desc',
          },
          select: {
            id: true,
            createdAt: true,
            status: true,
            deviceName: true,
            offeredPrice: true,
          },
        },
      },
    });

    if (!user) {
      return new NextResponse('User not found', { status: 404 });
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error('User Details Error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    // Prüfen, ob der Benutzer ein Admin ist
    const userToDelete = await prisma.user.findUnique({
      where: { id: params.id },
    });

    if (!userToDelete) {
      return new NextResponse('User not found', { status: 404 });
    }

    if (userToDelete.role === 'ADMIN') {
      return new NextResponse('Cannot delete admin users', { status: 403 });
    }

    // Benutzer und alle zugehörigen Daten löschen
    await prisma.$transaction([
      // Zuerst alle abhängigen Beziehungen löschen
      prisma.tradeInMessage.deleteMany({
        where: {
          userId: params.id,
        },
      }),
      prisma.tradeInRequest.deleteMany({
        where: {
          userId: params.id,
        },
      }),
      prisma.orderItem.deleteMany({
        where: {
          order: {
            userId: params.id,
          },
        },
      }),
      prisma.order.deleteMany({
        where: {
          userId: params.id,
        },
      }),
      // Dann den Benutzer selbst löschen
      prisma.user.delete({
        where: { id: params.id },
      }),
    ]);

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('Delete User Error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

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
    const { name, email } = body;

    if (!name && !email) {
      return new NextResponse('No data to update', { status: 400 });
    }

    const updatedUser = await prisma.user.update({
      where: { id: params.id },
      data: {
        ...(name && { name }),
        ...(email && { email }),
      },
    });

    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error('Update User Error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
} 