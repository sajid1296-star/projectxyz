import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { 
  CurrencyEuroIcon, 
  ShoppingCartIcon, 
  UserGroupIcon,
  CubeIcon 
} from '@heroicons/react/24/outline'
import DashboardStats from '@/components/admin/DashboardStats'
import RecentOrders from '@/components/admin/RecentOrders'
import TopProducts from '@/components/admin/TopProducts'

export default async function AdminDashboardPage() {
  const session = await getServerSession(authOptions)

  if (!session?.user?.role === 'ADMIN') {
    redirect('/')
  }

  // Statistiken berechnen
  const [
    totalRevenue,
    totalOrders,
    totalCustomers,
    totalProducts,
    recentOrders,
    topProducts
  ] = await Promise.all([
    prisma.order.aggregate({
      _sum: {
        total: true
      },
      where: {
        status: 'PAID'
      }
    }),
    prisma.order.count(),
    prisma.user.count({
      where: {
        role: 'USER'
      }
    }),
    prisma.product.count(),
    prisma.order.findMany({
      take: 5,
      orderBy: {
        createdAt: 'desc'
      },
      include: {
        user: {
          select: {
            name: true,
            email: true
          }
        }
      }
    }),
    prisma.$queryRaw`
      SELECT 
        p.id,
        p.name,
        COUNT(o.id) as orderCount,
        SUM(o.total) as revenue
      FROM Product p
      LEFT JOIN CartItem ci ON ci.productId = p.id
      LEFT JOIN Cart c ON ci.cartId = c.id
      LEFT JOIN Order o ON o.userId = c.userId
      WHERE o.status = 'PAID'
      GROUP BY p.id, p.name
      ORDER BY orderCount DESC
      LIMIT 5
    `
  ])

  const stats = [
    {
      name: 'Gesamtumsatz',
      value: `${totalRevenue._sum.total?.toFixed(2) ?? '0.00'} €`,
      icon: CurrencyEuroIcon,
    },
    {
      name: 'Bestellungen',
      value: totalOrders,
      icon: ShoppingCartIcon,
    },
    {
      name: 'Kunden',
      value: totalCustomers,
      icon: UserGroupIcon,
    },
    {
      name: 'Produkte',
      value: totalProducts,
      icon: CubeIcon,
    },
  ]

  return (
    <div className="min-h-full">
      <div className="py-6">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 md:px-8">
          <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
        </div>
        <div className="mx-auto max-w-7xl px-4 sm:px-6 md:px-8">
          <div className="py-4">
            <DashboardStats stats={stats} />
            
            <div className="mt-8 grid grid-cols-1 gap-4 lg:grid-cols-2">
              <RecentOrders orders={recentOrders} />
              <TopProducts products={topProducts} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 