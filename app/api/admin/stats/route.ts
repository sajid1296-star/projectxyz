import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Nicht autorisiert' },
        { status: 401 }
      );
    }

    // Hole verschiedene Statistiken
    const [
      orderStats,
      productStats,
      userStats,
      revenueStats
    ] = await Promise.all([
      // Bestellstatistiken nach Status
      prisma.order.groupBy({
        by: ['status'],
        _count: true
      }),
      
      // Produktstatistiken
      prisma.product.aggregate({
        _count: true,
        _sum: {
          stock: true
        }
      }),
      
      // Benutzerstatistiken
      prisma.user.count(),
      
      // Umsatzstatistiken nach Zeitraum
      prisma.$queryRaw`
        SELECT 
          DATE_TRUNC('day', "createdAt") as date,
          COUNT(*) as orders,
          SUM(total) as revenue
        FROM "Order"
        WHERE "createdAt" > NOW() - INTERVAL '30 days'
        GROUP BY DATE_TRUNC('day', "createdAt")
        ORDER BY date DESC
      `
    ]);

    return NextResponse.json({
      orders: orderStats,
      products: productStats,
      users: userStats,
      revenue: revenueStats
    });
  } catch (error) {
    console.error('Stats error:', error);
    return NextResponse.json(
      { error: 'Interner Server-Fehler' },
      { status: 500 }
    );
  }
} 