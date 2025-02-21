import { OrderStatus, TradeInStatus } from '@prisma/client';
import prisma from './prisma';
import { sendEmail } from './email';

export async function notifyAdminsNewOrder(orderId: string) {
  try {
    const [order, settings, admins] = await Promise.all([
      prisma.order.findUnique({
        where: { id: orderId },
        include: {
          user: true,
          items: {
            include: {
              product: true,
            },
          },
        },
      }),
      prisma.settings.findFirst(),
      prisma.user.findMany({
        where: { role: 'ADMIN' },
        select: { email: true },
      }),
    ]);

    if (!order || !settings?.orderNotifications) return;

    const adminEmails = admins.map(admin => admin.email).filter(Boolean) as string[];
    if (adminEmails.length === 0) return;

    const itemsList = order.items
      .map(item => `${item.product.name} (${item.quantity}x)`)
      .join('\n');

    await sendEmail({
      to: adminEmails,
      subject: `Neue Bestellung #${order.id}`,
      html: `
        <div style="font-family: sans-serif;">
          <h2>Neue Bestellung eingegangen</h2>
          <p><strong>Bestell-ID:</strong> ${order.id}</p>
          <p><strong>Kunde:</strong> ${order.user.name} (${order.user.email})</p>
          <p><strong>Gesamtbetrag:</strong> ${order.totalAmount}€</p>
          <h3>Bestellte Artikel:</h3>
          <pre>${itemsList}</pre>
          <p><a href="${process.env.NEXT_PUBLIC_URL}/admin/orders">Zur Bestellübersicht</a></p>
        </div>
      `,
    });
  } catch (error) {
    console.error('Admin Notification Error:', error);
  }
}

export async function notifyAdminsNewTradeIn(requestId: string) {
  try {
    const [request, settings, admins] = await Promise.all([
      prisma.tradeInRequest.findUnique({
        where: { id: requestId },
        include: {
          user: true,
        },
      }),
      prisma.settings.findFirst(),
      prisma.user.findMany({
        where: { role: 'ADMIN' },
        select: { email: true },
      }),
    ]);

    if (!request || !settings?.tradeInNotifications) return;

    const adminEmails = admins.map(admin => admin.email).filter(Boolean) as string[];
    if (adminEmails.length === 0) return;

    await sendEmail({
      to: adminEmails,
      subject: `Neue Ankaufsanfrage #${request.id}`,
      html: `
        <div style="font-family: sans-serif;">
          <h2>Neue Ankaufsanfrage eingegangen</h2>
          <p><strong>Anfrage-ID:</strong> ${request.id}</p>
          <p><strong>Kunde:</strong> ${request.user.name} (${request.user.email})</p>
          <p><strong>Gerät:</strong> ${request.brand} ${request.model}</p>
          <p><strong>Zustand:</strong> ${request.condition}</p>
          <p><a href="${process.env.NEXT_PUBLIC_URL}/admin/trade-in">Zur Ankaufsübersicht</a></p>
        </div>
      `,
    });
  } catch (error) {
    console.error('Admin Notification Error:', error);
  }
}

export async function generateAdminReport(startDate: Date, endDate: Date) {
  try {
    const [
      orderStats,
      tradeInStats,
      userStats,
      productStats,
    ] = await Promise.all([
      // Bestellstatistiken
      prisma.order.aggregate({
        where: {
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        },
        _count: true,
        _sum: {
          totalAmount: true,
        },
      }),

      // Ankaufsstatistiken
      prisma.tradeInRequest.groupBy({
        where: {
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        },
        by: ['status'],
        _count: true,
      }),

      // Benutzerstatistiken
      prisma.user.count({
        where: {
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        },
      }),

      // Produktstatistiken
      prisma.orderItem.groupBy({
        where: {
          order: {
            createdAt: {
              gte: startDate,
              lte: endDate,
            },
          },
        },
        by: ['productId'],
        _sum: {
          quantity: true,
          price: true,
        },
      }),
    ]);

    return {
      period: {
        start: startDate,
        end: endDate,
      },
      orders: {
        total: orderStats._count,
        revenue: orderStats._sum.totalAmount || 0,
      },
      tradeIns: tradeInStats.reduce((acc, stat) => {
        acc[stat.status] = stat._count;
        return acc;
      }, {} as Record<TradeInStatus, number>),
      newUsers: userStats,
      products: productStats,
    };
  } catch (error) {
    console.error('Report Generation Error:', error);
    throw error;
  }
} 