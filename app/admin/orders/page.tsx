import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import AdminOrderList from '@/components/admin/AdminOrderList'

export default async function AdminOrdersPage() {
  const session = await getServerSession(authOptions)

  if (!session?.user?.role === 'ADMIN') {
    redirect('/')
  }

  const orders = await prisma.order.findMany({
    include: {
      user: {
        select: {
          name: true,
          email: true,
        },
      },
      items: {
        include: {
          product: true,
        },
      },
      shippingAddress: true,
      billingAddress: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  })

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-base font-semibold leading-6 text-gray-900">
            Bestellungen
          </h1>
          <p className="mt-2 text-sm text-gray-700">
            Verwalten Sie alle Bestellungen und deren Status.
          </p>
        </div>
      </div>
      <div className="mt-8">
        <AdminOrderList orders={orders} />
      </div>
    </div>
  )
} 