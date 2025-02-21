'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { de } from 'date-fns/locale'
import { useRouter } from 'next/navigation'
import { Order, OrderItem, Product, Address, User } from '@prisma/client'

interface ExtendedOrderItem extends OrderItem {
  product: Product
}

interface ExtendedOrder extends Order {
  user: {
    name: string | null
    email: string | null
  }
  items: ExtendedOrderItem[]
  shippingAddress: Address
  billingAddress: Address
}

interface AdminOrderListProps {
  orders: ExtendedOrder[]
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

export default function AdminOrderList({ orders: initialOrders }: AdminOrderListProps) {
  const router = useRouter()
  const [orders, setOrders] = useState(initialOrders)
  const [isUpdating, setIsUpdating] = useState<string | null>(null)

  const updateOrderStatus = async (orderId: string, status: Order['status']) => {
    setIsUpdating(orderId)
    try {
      const response = await fetch(`/api/admin/orders/${orderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })

      if (!response.ok) throw new Error('Update fehlgeschlagen')

      setOrders(orders.map(order => 
        order.id === orderId ? { ...order, status } : order
      ))
      router.refresh()
    } catch (error) {
      console.error('Error:', error)
      alert('Fehler beim Aktualisieren des Status')
    } finally {
      setIsUpdating(null)
    }
  }

  return (
    <div className="mt-8 flow-root">
      <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
        <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
          <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg">
            <table className="min-w-full divide-y divide-gray-300">
              <thead className="bg-gray-50">
                <tr>
                  <th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">
                    Bestellung
                  </th>
                  <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                    Kunde
                  </th>
                  <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                    Datum
                  </th>
                  <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                    Status
                  </th>
                  <th className="px-3 py-3.5 text-right text-sm font-semibold text-gray-900">
                    Summe
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {orders.map((order) => (
                  <tr key={order.id}>
                    <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
                      #{order.id}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                      {order.user.name || order.user.email}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                      {format(new Date(order.createdAt), 'PPP', { locale: de })}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                      <select
                        value={order.status}
                        onChange={(e) => updateOrderStatus(order.id, e.target.value as Order['status'])}
                        disabled={isUpdating === order.id}
                        className={`rounded-md px-2 py-1 text-sm font-medium ${
                          orderStatusMap[order.status].color
                        }`}
                      >
                        {Object.entries(orderStatusMap).map(([value, { label }]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 text-right">
                      {order.total.toFixed(2)} €
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
} 