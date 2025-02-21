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

    const { searchParams } = new URL(request.url);
    const start = searchParams.get('start');
    const end = searchParams.get('end');

    if (!start || !end) {
      return new NextResponse('Start and end dates are required', { status: 400 });
    }

    const startDate = new Date(start);
    const endDate = new Date(end);
    endDate.setHours(23, 59, 59, 999);

    const [dailyOrders, topProducts, topCustomers] = await Promise.all([
      // Tägliche Bestellungen und Umsatz
      prisma.$queryRaw`
        SELECT 
          DATE(createdAt) as date,
          COUNT(*) as count,
          SUM(totalAmount) as revenue
        FROM \`Order\`
        WHERE createdAt BETWEEN ${startDate} AND ${endDate}
        GROUP BY DATE(createdAt)
        ORDER BY date ASC
      `,

      // Top-Produkte
      prisma.orderItem.groupBy({
        by: ['productId'],
        _sum: {
          quantity: true,
          price: true,
        },
        where: {
          order: {
            createdAt: {
              gte: startDate,
              lte: endDate,
            },
          },
        },
        orderBy: {
          _sum: {
            quantity: 'desc',
          },
        },
        take: 10,
      }),

      // Top-Kunden
      prisma.order.groupBy({
        by: ['userId'],
        _sum: {
          totalAmount: true,
        },
        _count: true,
        where: {
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        },
        orderBy: {
          _sum: {
            totalAmount: 'desc',
          },
        },
        take: 10,
      }),
    ]);

    // Fülle fehlende Tage mit Nullwerten auf
    const allDates = new Map();
    let currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      allDates.set(
        currentDate.toISOString().split('T')[0],
        { count: 0, revenue: 0 }
      );
      currentDate.setDate(currentDate.getDate() + 1);
    }

    (dailyOrders as any[]).forEach(order => {
      const dateStr = new Date(order.date).toISOString().split('T')[0];
      allDates.set(dateStr, {
        count: Number(order.count),
        revenue: Number(order.revenue),
      });
    });

    const formattedDailyOrders = Array.from(allDates.entries()).map(
      ([date, data]) => ({
        date,
        ...data,
      })
    );

    return NextResponse.json({
      dailyOrders: formattedDailyOrders,
      topProducts,
      topCustomers,
    });
  } catch (error) {
    console.error('Analytics Error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
} 