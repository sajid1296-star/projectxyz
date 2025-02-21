import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET(
  request: Request,
  { params }: { params: { orderId: string } }
) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    const order = await prisma.order.findFirst({
      where: {
        id: params.orderId,
        userId: session.user.id, // Sicherheitscheck: Nur eigene Bestellungen anzeigen
      },
      include: {
        items: {
          include: {
            product: {
              select: {
                name: true,
                images: true,
              },
            },
          },
        },
        shippingAddress: true,
      },
    });

    if (!order) {
      return new NextResponse('Bestellung nicht gefunden', { status: 404 });
    }

    // Formatiere die Antwort
    const formattedOrder = {
      id: order.id,
      createdAt: order.createdAt,
      status: order.status,
      total: order.total,
      paymentStatus: order.paymentStatus,
      trackingNumber: order.trackingNumber,
      items: order.items.map((item) => ({
        id: item.id,
        quantity: item.quantity,
        price: item.price,
        product: {
          name: item.product.name,
          images: item.product.images,
        },
      })),
      shippingAddress: order.shippingAddress ? {
        firstName: order.shippingAddress.firstName,
        lastName: order.shippingAddress.lastName,
        street: order.shippingAddress.street,
        city: order.shippingAddress.city,
        postalCode: order.shippingAddress.postalCode,
        country: order.shippingAddress.country,
      } : null,
    };

    return NextResponse.json(formattedOrder);
  } catch (error) {
    console.error('Order Details Error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

// Optional: PUT-Route für Statusaktualisierungen (z.B. Stornierung)
export async function PUT(
  request: Request,
  { params }: { params: { orderId: string } }
) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    const body = await request.json();
    const { action } = body;

    const order = await prisma.order.findFirst({
      where: {
        id: params.orderId,
        userId: session.user.id,
      },
    });

    if (!order) {
      return new NextResponse('Bestellung nicht gefunden', { status: 404 });
    }

    // Prüfe, ob die Bestellung storniert werden kann
    if (action === 'cancel') {
      if (['delivered', 'shipped'].includes(order.status)) {
        return new NextResponse(
          'Bestellung kann nicht mehr storniert werden',
          { status: 400 }
        );
      }

      const updatedOrder = await prisma.order.update({
        where: { id: params.orderId },
        data: {
          status: 'cancelled',
          cancelledAt: new Date(),
        },
      });

      // Erstelle Aktivitätslog
      await prisma.userActivity.create({
        data: {
          userId: session.user.id,
          type: 'order_cancelled',
          description: `Bestellung ${params.orderId} wurde storniert`,
          metadata: {
            orderId: params.orderId,
          },
        },
      });

      return NextResponse.json(updatedOrder);
    }

    return new NextResponse('Ungültige Aktion', { status: 400 });
  } catch (error) {
    console.error('Order Update Error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
} 