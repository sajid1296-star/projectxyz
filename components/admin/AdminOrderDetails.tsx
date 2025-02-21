'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { de } from 'date-fns/locale'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Order, OrderItem, Product, Image as ImageType, Address, User } from '@prisma/client'

interface ExtendedOrderItem extends OrderItem {
  product: Product & {
    images: ImageType[]
  }
}

interface ExtendedOrder extends Order {
  user: {
    id: string
    name: string | null
    email: string | null
    createdAt: Date
  }
  items: ExtendedOrderItem[]
  shippingAddress: Address
  billingAddress: Address
}

interface AdminOrderDetailsProps {
  order: ExtendedOrder
  customerOrders: Order[]
}

const orderStatusMap = {
  PENDING: {
    label: 'Ausstehend',
    color: 'bg-yellow-100 text-yellow-800',
  },
  PROCESSING: {
    label: 'In Bearbeitung',
    color: 'bg-blue-100 text-blue-800',
  },
  SHIPPED: {
    label: 'Versendet',
    color: 'bg-purple-100 text-purple-800',
  },
  DELIVERED: {
    label: 'Geliefert',
    color: 'bg-green-100 text-green-800',
  },
  CANCELLED: {
    label: 'Storniert',
    color: 'bg-red-100 text-red-800',
  },
}

export default function AdminOrderDetails({ 
  order: initialOrder, 
  customerOrders 
}: AdminOrderDetailsProps) {
  const router = useRouter()
  const [order, setOrder] = useState(initialOrder)
  const [isUpdating, setIsUpdating] = useState(false)

  const updateOrderStatus = async (status: Order['status']) => {
    setIsUpdating(true)
    try {
      const response = await fetch(`/api/admin/orders/${order.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })

      if (!response.ok) throw new Error('Update fehlgeschlagen')

      setOrder({ ...order, status })
      router.refresh()
    } catch (error) {
      console.error('Error:', error)
      alert('Fehler beim Aktualisieren des Status')
    } finally {
      setIsUpdating(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Kundeninformationen */}
      <div className="rounded-lg bg-white shadow">
        <div className="px-4 py-5 sm:p-6">
          <h2 className="text-lg font-medium leading-6 text-gray-900">
            Kundeninformationen
          </h2>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <p className="text-sm font-medium text-gray-500">Name</p>
              <p className="mt-1 text-sm text-gray-900">{order.user.name}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">E-Mail</p>
              <p className="mt-1 text-sm text-gray-900">{order.user.email}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Kunde seit</p>
              <p className="mt-1 text-sm text-gray-900">
                {format(new Date(order.user.createdAt), 'PPP', { locale: de })}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Bestellungen insgesamt</p>
              <p className="mt-1 text-sm text-gray-900">
                {customerOrders.length + 1}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Bestellstatus */}
      <div className="rounded-lg bg-white shadow">
        <div className="px-4 py-5 sm:p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium leading-6 text-gray-900">
              Bestellstatus
            </h2>
            <select
              value={order.status}
              onChange={(e) => updateOrderStatus(e.target.value as Order['status'])}
              disabled={isUpdating}
              className={`rounded-md px-3 py-2 text-sm font-medium ${
                orderStatusMap[order.status].color
              }`}
            >
              {Object.entries(orderStatusMap).map(([value, { label }]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div className="mt-4">
            <p className="text-sm text-gray-500">
              Bestellt am {format(new Date(order.createdAt), 'PPP', { locale: de })}
            </p>
          </div>
        </div>
      </div>

      {/* Bestellte Artikel */}
      <div className="rounded-lg bg-white shadow">
        <div className="px-4 py-5 sm:p-6">
          <h2 className="text-lg font-medium leading-6 text-gray-900">
            Bestellte Artikel
          </h2>
          <div className="mt-6 flow-root">
            <ul role="list" className="-my-6 divide-y divide-gray-200">
              {order.items.map((item) => (
                <li key={item.id} className="flex py-6">
                  <div className="h-24 w-24 flex-shrink-0 overflow-hidden rounded-md border border-gray-200">
                    <Image
                      src={item.product.images[0]?.url || '/images/placeholder.png'}
                      alt={item.product.name}
                      width={96}
                      height={96}
                      className="h-full w-full object-cover object-center"
                    />
                  </div>
                  <div className="ml-4 flex flex-1 flex-col">
                    <div>
                      <div className="flex justify-between text-base font-medium text-gray-900">
                        <h3>
                          <Link href={`/admin/products/${item.product.id}`}>
                            {item.product.name}
                          </Link>
                        </h3>
                        <p className="ml-4">{item.price.toFixed(2)} €</p>
                      </div>
                      <p className="mt-1 text-sm text-gray-500">
                        Menge: {item.quantity}
                      </p>
                    </div>
                    <div className="flex flex-1 items-end justify-between text-sm">
                      <p className="text-gray-500">
                        Zwischensumme: {(item.price * item.quantity).toFixed(2)} €
                      </p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
          <div className="mt-6 border-t border-gray-200 pt-4">
            <div className="flex justify-between text-base font-medium text-gray-900">
              <p>Gesamtsumme</p>
              <p>{order.total.toFixed(2)} €</p>
            </div>
          </div>
        </div>
      </div>

      {/* Adressen */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div className="rounded-lg bg-white shadow">
          <div className="px-4 py-5 sm:p-6">
            <h2 className="text-lg font-medium leading-6 text-gray-900">
              Lieferadresse
            </h2>
            <div className="mt-4 space-y-1">
              <p className="text-sm font-medium text-gray-900">
                {order.shippingAddress.street}
              </p>
              <p className="text-sm text-gray-500">
                {order.shippingAddress.postalCode} {order.shippingAddress.city}
              </p>
              <p className="text-sm text-gray-500">
                {order.shippingAddress.country}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-lg bg-white shadow">
          <div className="px-4 py-5 sm:p-6">
            <h2 className="text-lg font-medium leading-6 text-gray-900">
              Rechnungsadresse
            </h2>
            <div className="mt-4 space-y-1">
              <p className="text-sm font-medium text-gray-900">
                {order.billingAddress.street}
              </p>
              <p className="text-sm text-gray-500">
                {order.billingAddress.postalCode} {order.billingAddress.city}
              </p>
              <p className="text-sm text-gray-500">
                {order.billingAddress.country}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Weitere Bestellungen des Kunden */}
      {customerOrders.length > 0 && (
        <div className="rounded-lg bg-white shadow">
          <div className="px-4 py-5 sm:p-6">
            <h2 className="text-lg font-medium leading-6 text-gray-900">
              Weitere Bestellungen des Kunden
            </h2>
            <div className="mt-4">
              <ul role="list" className="divide-y divide-gray-200">
                {customerOrders.map((order) => (
                  <li key={order.id} className="py-4">
                    <Link
                      href={`/admin/orders/${order.id}`}
                      className="flex items-center justify-between hover:bg-gray-50"
                    >
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          Bestellung #{order.id}
                        </p>
                        <p className="text-sm text-gray-500">
                          {format(new Date(order.createdAt), 'PPP', { locale: de })}
                        </p>
                      </div>
                      <div>
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            orderStatusMap[order.status].color
                          }`}
                        >
                          {orderStatusMap[order.status].label}
                        </span>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 