'use client'

import { format } from 'date-fns'
import { de } from 'date-fns/locale'
import Image from 'next/image'
import Link from 'next/link'
import { Order, OrderItem, Product, Image as ImageType } from '@prisma/client'

interface ExtendedOrderItem extends OrderItem {
  product: Product & {
    images: ImageType[]
  }
}

interface ExtendedOrder extends Order {
  items: ExtendedOrderItem[]
}

interface OrderListProps {
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

export default function OrderList({ orders }: OrderListProps) {
  if (orders.length === 0) {
    return (
      <div className="text-center">
        <p className="text-sm text-gray-500">
          Sie haben noch keine Bestellungen aufgegeben.
        </p>
        <Link
          href="/products"
          className="mt-4 inline-flex items-center rounded-md bg-primary-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600"
        >
          Produkte entdecken
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {orders.map((order) => (
        <div
          key={order.id}
          className="overflow-hidden rounded-lg bg-white shadow"
        >
          <div className="border-b border-gray-200 bg-gray-50 px-4 py-4 sm:px-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold leading-6 text-gray-900">
                  Bestellung #{order.id}
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  Bestellt am {format(new Date(order.createdAt), 'PPP', { locale: de })}
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
            </div>
          </div>
          <div className="px-4 py-5 sm:p-6">
            <div className="flow-root">
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
                            <Link href={`/products/${item.product.id}`}>
                              {item.product.name}
                            </Link>
                          </h3>
                          <p className="ml-4">{item.price.toFixed(2)} €</p>
                        </div>
                        <p className="mt-1 text-sm text-gray-500">
                          Menge: {item.quantity}
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
      ))}
    </div>
  )
} 