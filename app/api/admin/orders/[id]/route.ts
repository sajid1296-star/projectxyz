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
    const order = await prisma.order.findUnique({
      where: {
        id: params.id,
      },
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
        items: true,
      },
    });

    if (!order) {
      return new NextResponse('Order not found', { status: 404 });
    }

    return NextResponse.json(order);
  } catch (error) {
    console.error('Order Details Error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.role === 'ADMIN') {
      return NextResponse.json(
        { error: 'Nicht autorisiert' },
        { status: 401 }
      );
    }

    const { status } = await req.json();

    const validStatuses = ['PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: 'Ungültiger Status' },
        { status: 400 }
      );
    }

    const order = await prisma.order.update({
      where: { id: params.id },
      data: { status },
    });

    return NextResponse.json(order);
  } catch (error) {
    console.error('Order update error:', error);
    return NextResponse.json(
      { error: 'Interner Server-Fehler' },
      { status: 500 }
    );
  }
}

// Bestellstatus aktualisieren
export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.role === 'ADMIN') {
      return NextResponse.json(
        { error: 'Nicht autorisiert' },
        { status: 401 }
      )
    }

    const { status } = await req.json()

    const order = await prisma.order.update({
      where: { id: params.id },
      data: { status },
    })

    return NextResponse.json(order)
  } catch (error) {
    console.error('Order update error:', error)
    return NextResponse.json(
      { error: 'Interner Server-Fehler' },
      { status: 500 }
    )
  }
} 