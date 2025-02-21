import { format } from 'date-fns'
import { de } from 'date-fns/locale'
import Image from 'next/image'
import Link from 'next/link'
import { Order, OrderItem, Product, Image as ImageType, Address } from '@prisma/client'

interface ExtendedOrderItem extends OrderItem {
  product: Product & {
    images: ImageType[]
  }
}

interface ExtendedOrder extends Order {
  items: ExtendedOrderItem[]
  shippingAddress: Address
  billingAddress: Address
}

interface OrderDetailsProps {
  order: ExtendedOrder
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

export default function OrderDetails({ order }: OrderDetailsProps) {
  return (
    <div className="space-y-8">
      {/* Bestellkopf */}
      <div className="rounded-lg bg-white shadow">
        <div className="px-4 py-5 sm:px-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium leading-6 text-gray-900">
                Bestellung #{order.id}
              </h3>
              <p className="mt-1 max-w-2xl text-sm text-gray-500">
                Bestellt am {format(new Date(order.createdAt), 'PPP', { locale: de })}
              </p>
            </div>
            <span
              className={`inline-flex items-center rounded-full px-3 py-0.5 text-sm font-medium ${
                orderStatusMap[order.status].color
              }`}
            >
              {orderStatusMap[order.status].label}
            </span>
          </div>
        </div>
      </div>

      {/* Bestellpositionen */}
      <div className="rounded-lg bg-white shadow">
        <div className="px-4 py-5 sm:p-6">
          <h4 className="text-lg font-medium leading-6 text-gray-900">
            Bestellte Artikel
          </h4>
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
        {/* Lieferadresse */}
        <div className="rounded-lg bg-white shadow">
          <div className="px-4 py-5 sm:p-6">
            <h4 className="text-lg font-medium leading-6 text-gray-900">
              Lieferadresse
            </h4>
            <div className="mt-4 space-y-1 text-sm">
              <p className="font-medium text-gray-900">
                {order.shippingAddress.street}
              </p>
              <p className="text-gray-500">
                {order.shippingAddress.postalCode} {order.shippingAddress.city}
              </p>
              <p className="text-gray-500">{order.shippingAddress.country}</p>
            </div>
          </div>
        </div>

        {/* Rechnungsadresse */}
        <div className="rounded-lg bg-white shadow">
          <div className="px-4 py-5 sm:p-6">
            <h4 className="text-lg font-medium leading-6 text-gray-900">
              Rechnungsadresse
            </h4>
            <div className="mt-4 space-y-1 text-sm">
              <p className="font-medium text-gray-900">
                {order.billingAddress.street}
              </p>
              <p className="text-gray-500">
                {order.billingAddress.postalCode} {order.billingAddress.city}
              </p>
              <p className="text-gray-500">{order.billingAddress.country}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 