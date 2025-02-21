import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import UserManager from '@/components/admin/users/UserManager'

export default async function AdminUsersPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.role === 'ADMIN') redirect('/')

  const [users, permissions, stats] = await Promise.all([
    prisma.user.findMany({
      include: {
        permissions: true,
        metadata: true,
        _count: {
          select: {
            orders: true,
            reviews: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    }),
    prisma.permission.findMany(),
    prisma.$queryRaw`
      SELECT 
        u.role,
        COUNT(*) as count,
        COUNT(DISTINCT o.id) as orders,
        SUM(o.total) as revenue
      FROM "User" u
      LEFT JOIN "Order" o ON u.id = o."userId"
      GROUP BY u.role
    `
  ])

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <UserManager 
        users={users}
        permissions={permissions}
        stats={stats}
      />
    </div>
  )
} 