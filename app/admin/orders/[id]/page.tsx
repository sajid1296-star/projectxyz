import { getServerSession } from 'next-auth'
import { redirect, notFound } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import AdminOrderDetails from '@/components/admin/AdminOrderDetails'

interface AdminOrderPageProps {
  params: {
    id: string
  }
}

export default async function AdminOrderPage({ params }: AdminOrderPageProps) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.role === 'ADMIN') {
    redirect('/')
  }

  const order = await prisma.order.findUnique({
    where: {
      id: params.id,
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          createdAt: true,
        },
      },
      items: {
        include: {
          product: {
            include: {
              images: true,
            },
          },
        },
      },
      shippingAddress: true,
      billingAddress: true,
    },
  })

  if (!order) {
    notFound()
  }

  // Hole weitere Bestellungen des Kunden
  const customerOrders = await prisma.order.findMany({
    where: {
      userId: order.userId,
      NOT: {
        id: order.id, // Aktuelle Bestellung ausschließen
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
    take: 5, // Nur die letzten 5 Bestellungen
  })

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-base font-semibold leading-6 text-gray-900">
            Bestellung #{order.id}
          </h1>
        </div>
      </div>
      <div className="mt-8">
        <AdminOrderDetails order={order} customerOrders={customerOrders} />
      </div>
    </div>
  )
} 