import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import OrderList from '@/components/orders/OrderList'

export default async function OrdersPage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/auth/login')
  }

  const orders = await prisma.order.findMany({
    where: {
      userId: session.user.id,
    },
    include: {
      items: {
        include: {
          product: {
            include: {
              images: true,
            },
          },
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  })

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <div className="py-8">
        <h1 className="text-2xl font-semibold text-gray-900">
          Meine Bestellungen
        </h1>
        <div className="mt-8">
          <OrderList orders={orders} />
        </div>
      </div>
    </div>
  )
} 