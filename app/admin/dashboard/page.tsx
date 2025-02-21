import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { 
  DashboardStats, 
  RecentOrders, 
  SalesChart, 
  TopProducts 
} from '@/components/admin/dashboard'

export default async function AdminDashboardPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.role === 'ADMIN') redirect('/')

  // Hole alle relevanten Daten für das Dashboard
  const [
    totalOrders,
    totalRevenue,
    recentOrders,
    topProducts,
    monthlySales
  ] = await Promise.all([
    prisma.order.count(),
    prisma.order.aggregate({
      _sum: { total: true }
    }),
    prisma.order.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        user: true,
        items: { include: { product: true } }
      }
    }),
    prisma.orderItem.groupBy({
      by: ['productId'],
      _sum: { quantity: true },
      _count: true,
      orderBy: {
        _count: { _all: 'desc' }
      },
      take: 5
    }),
    // Monatliche Verkäufe für Chart
    prisma.$queryRaw`
      SELECT DATE_TRUNC('month', "createdAt") as month,
             COUNT(*) as count,
             SUM(total) as revenue
      FROM "Order"
      WHERE "createdAt" > NOW() - INTERVAL '6 months'
      GROUP BY DATE_TRUNC('month', "createdAt")
      ORDER BY month DESC
    `
  ])

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
      
      <DashboardStats
        totalOrders={totalOrders}
        totalRevenue={totalRevenue._sum.total || 0}
      />
      
      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-2">
        <SalesChart data={monthlySales} />
        <TopProducts data={topProducts} />
      </div>
      
      <div className="mt-8">
        <RecentOrders orders={recentOrders} />
      </div>
    </div>
  )
} 