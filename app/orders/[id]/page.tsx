import { getServerSession } from 'next-auth'
import { redirect, notFound } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import OrderDetails from '@/components/orders/OrderDetails'

interface OrderPageProps {
  params: {
    id: string
  }
}

export default async function OrderPage({ params }: OrderPageProps) {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/auth/login')
  }

  const order = await prisma.order.findUnique({
    where: {
      id: params.id,
      userId: session.user.id, // Sicherstellen, dass die Bestellung dem Benutzer gehört
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
      shippingAddress: true,
      billingAddress: true,
    },
  })

  if (!order) {
    notFound()
  }

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <div className="py-8">
        <OrderDetails order={order} />
      </div>
    </div>
  )
} 