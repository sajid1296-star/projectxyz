import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import OrderList from '@/components/profile/OrderList'

export default async function OrdersPage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/auth/login')
  }

  const orders = await prisma.order.findMany({
    where: {
      userId: session.user.id,
    },
    orderBy: {
      createdAt: 'desc',
    },
  })

  return (
    <div className="bg-white">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">
          Meine Bestellungen
        </h1>
        <p className="mt-2 text-sm text-gray-500">
          Überprüfen Sie den Status Ihrer Bestellungen und sehen Sie sich vergangene Bestellungen an.
        </p>

        <div className="mt-16">
          <OrderList orders={orders} />
        </div>
      </div>
    </div>
  )
} 