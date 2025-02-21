import Link from 'next/link'
import { Order } from '@prisma/client'
import { format } from 'date-fns'
import { de } from 'date-fns/locale'

interface OrderListProps {
  orders: Order[]
}

const statusMap = {
  PAID: {
    text: 'Bezahlt',
    color: 'bg-green-100 text-green-800',
  },
  PROCESSING: {
    text: 'In Bearbeitung',
    color: 'bg-yellow-100 text-yellow-800',
  },
  SHIPPED: {
    text: 'Versendet',
    color: 'bg-blue-100 text-blue-800',
  },
  DELIVERED: {
    text: 'Geliefert',
    color: 'bg-gray-100 text-gray-800',
  },
}

export default function OrderList({ orders }: OrderListProps) {
  if (orders.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-sm text-gray-500">Sie haben noch keine Bestellungen aufgegeben.</p>
        <Link
          href="/products"
          className="mt-6 inline-flex items-center rounded-md bg-primary-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-primary-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600"
        >
          Jetzt einkaufen
        </Link>
      </div>
    )
  }

  return (
    <div className="overflow-hidden bg-white shadow sm:rounded-md">
      <ul role="list" className="divide-y divide-gray-200">
        {orders.map((order) => {
          const status = statusMap[order.status as keyof typeof statusMap]
          const shippingAddress = JSON.parse(order.shippingAddress)
          
          return (
            <li key={order.id}>
              <div className="px-4 py-5 sm:px-6">
                <div className="flex items-center justify-between">
                  <div className="flex flex-col space-y-2">
                    <p className="text-sm font-medium text-gray-900">
                      Bestellung #{order.id}
                    </p>
                    <p className="text-sm text-gray-500">
                      Bestellt am {format(new Date(order.createdAt), 'PPP', { locale: de })}
                    </p>
                    <p className="text-sm text-gray-500">
                      Gesamtbetrag: {order.total.toFixed(2)} €
                    </p>
                    <div className="mt-2">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${status.color}`}
                      >
                        {status.text}
                      </span>
                    </div>
                  </div>
                  
                  <div className="text-sm text-gray-500">
                    <p className="font-medium">Lieferadresse:</p>
                    <p>{shippingAddress.name}</p>
                    <p>{shippingAddress.address.line1}</p>
                    {shippingAddress.address.line2 && (
                      <p>{shippingAddress.address.line2}</p>
                    )}
                    <p>
                      {shippingAddress.address.postal_code} {shippingAddress.address.city}
                    </p>
                    <p>{shippingAddress.address.country}</p>
                  </div>
                </div>
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
} 