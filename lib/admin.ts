import prisma from './prisma';
import { OrderStatus, TradeInStatus } from '@prisma/client';

export async function getAdminDashboardStats(startDate: Date) {
  const [
    totalRevenue,
    totalOrders,
    totalCustomers,
    totalTradeIns,
    revenueByMonth,
    ordersByStatus,
    tradeInsByStatus,
  ] = await Promise.all([
    // Gesamtumsatz
    prisma.order.aggregate({
      _sum: {
        totalAmount: true,
      },
      where: {
        createdAt: {
          gte: startDate,
        },
      },
    }),

    // Gesamtanzahl Bestellungen
    prisma.order.count({
      where: {
        createdAt: {
          gte: startDate,
        },
      },
    }),

    // Gesamtanzahl Kunden
    prisma.user.count({
      where: {
        role: 'USER',
        createdAt: {
          gte: startDate,
        },
      },
    }),

    // Gesamtanzahl Ankaufsanfragen
    prisma.tradeInRequest.count({
      where: {
        createdAt: {
          gte: startDate,
        },
      },
    }),

    // Umsatz nach Monat
    prisma.$queryRaw`
      SELECT 
        DATE_FORMAT(createdAt, '%Y-%m') as month,
        SUM(totalAmount) as revenue
      FROM \`Order\`
      WHERE createdAt >= ${startDate}
      GROUP BY month
      ORDER BY month ASC
    `,

    // Bestellungen nach Status
    prisma.order.groupBy({
      by: ['status'],
      _count: true,
      where: {
        createdAt: {
          gte: startDate,
        },
      },
    }),

    // Ankaufsanfragen nach Status
    prisma.tradeInRequest.groupBy({
      by: ['status'],
      _count: true,
      where: {
        createdAt: {
          gte: startDate,
        },
      },
    }),
  ]);

  return {
    totalRevenue: totalRevenue._sum.totalAmount || 0,
    totalOrders,
    totalCustomers,
    totalTradeIns,
    revenueByMonth,
    ordersByStatus: formatStatusCounts(ordersByStatus, OrderStatus),
    tradeInsByStatus: formatStatusCounts(tradeInsByStatus, TradeInStatus),
  };
}

function formatStatusCounts(
  counts: { status: string; _count: number }[],
  statusEnum: any
) {
  const allStatuses = Object.values(statusEnum);
  const countMap = new Map(counts.map(({ status, _count }) => [status, _count]));
  
  return {
    labels: allStatuses,
    data: allStatuses.map(status => countMap.get(status) || 0),
  };
}

export async function getAdminOrderStats(startDate: Date, endDate: Date) {
  const [dailyOrders, topProducts, topCustomers] = await Promise.all([
    // Tägliche Bestellungen
    prisma.$queryRaw`
      SELECT 
        DATE(createdAt) as date,
        COUNT(*) as count,
        SUM(totalAmount) as revenue
      FROM \`Order\`
      WHERE createdAt BETWEEN ${startDate} AND ${endDate}
      GROUP BY date
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

  return {
    dailyOrders,
    topProducts,
    topCustomers,
  };
}

// Admin-Hilfsfunktionen für häufig verwendete Berechnungen und Formatierungen

export function calculateGrowth(current: number, previous: number): number {
  if (previous === 0) return 100
  return ((current - previous) / previous) * 100
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR'
  }).format(amount)
}

export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('de-DE', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(date)
}

export function generateReportData(data: any[], type: 'daily' | 'monthly' | 'yearly') {
  // Gruppiert und aggregiert Daten für verschiedene Berichtszeiträume
  const groupedData = data.reduce((acc, curr) => {
    const date = new Date(curr.createdAt)
    let key: string

    switch (type) {
      case 'daily':
        key = date.toISOString().split('T')[0]
        break
      case 'monthly':
        key = `${date.getFullYear()}-${date.getMonth() + 1}`
        break
      case 'yearly':
        key = date.getFullYear().toString()
        break
    }

    if (!acc[key]) {
      acc[key] = {
        orders: 0,
        revenue: 0,
        items: 0
      }
    }

    acc[key].orders++
    acc[key].revenue += curr.total
    acc[key].items += curr.items.length

    return acc
  }, {})

  return Object.entries(groupedData).map(([date, stats]) => ({
    date,
    ...stats
  }))
} 