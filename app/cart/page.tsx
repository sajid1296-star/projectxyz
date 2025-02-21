'use client'

import { useCart } from '@/hooks/useCart'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function CartPage() {
  const router = useRouter()
  const { items, total, removeFromCart, updateQuantity } = useCart()

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">
            Ihr Warenkorb ist leer
          </h1>
          <p className="mt-4 text-base text-gray-500">
            Entdecken Sie unsere Produkte und füllen Sie Ihren Warenkorb.
          </p>
          <div className="mt-6">
            <Link
              href="/products"
              className="inline-flex items-center rounded-md border border-transparent bg-primary-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary-700"
            >
              Produkte ansehen
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6 sm:py-24 lg:max-w-7xl lg:px-8">
      <h1 className="text-3xl font-bold tracking-tight text-gray-900">
        Warenkorb
      </h1>

      <div className="mt-12">
        <div className="flow-root">
          <ul role="list" className="-my-6 divide-y divide-gray-200">
            {items.map((item) => (
              <li key={`${item.productId}-${item.variantId}`} className="flex py-6">
                <div className="h-24 w-24 flex-shrink-0 overflow-hidden rounded-md border border-gray-200">
                  <Image
                    src={item.image}
                    alt={item.name}
                    width={96}
                    height={96}
                    className="h-full w-full object-cover object-center"
                  />
                </div>

                <div className="ml-4 flex flex-1 flex-col">
                  <div>
                    <div className="flex justify-between text-base font-medium text-gray-900">
                      <h3>
                        <Link href={`/products/${item.productId}`}>
                          {item.name}
                        </Link>
                      </h3>
                      <p className="ml-4">{item.price.toFixed(2)} €</p>
                    </div>
                  </div>
                  <div className="flex flex-1 items-end justify-between text-sm">
                    <div className="flex items-center">
                      <select
                        value={item.quantity}
                        onChange={(e) => updateQuantity(item.productId, item.variantId, Number(e.target.value))}
                        className="rounded-md border-gray-300 py-1.5 text-base leading-5 focus:border-primary-500 focus:outline-none focus:ring-primary-500 sm:text-sm"
                      >
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                          <option key={num} value={num}>
                            {num}
                          </option>
                        ))}
                      </select>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeFromCart(item.productId, item.variantId)}
                      className="font-medium text-primary-600 hover:text-primary-500"
                    >
                      Entfernen
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-10 border-t border-gray-200 pt-6">
          <div className="flex justify-between text-base font-medium text-gray-900">
            <p>Gesamtsumme</p>
            <p>{total.toFixed(2)} €</p>
          </div>
          <div className="mt-6">
            <button
              onClick={() => router.push('/checkout')}
              className="w-full rounded-md border border-transparent bg-primary-600 px-6 py-3 text-base font-medium text-white shadow-sm hover:bg-primary-700"
            >
              Zur Kasse
            </button>
          </div>
          <div className="mt-6 flex justify-center text-center text-sm text-gray-500">
            <p>
              oder{' '}
              <Link
                href="/products"
                className="font-medium text-primary-600 hover:text-primary-500"
              >
                Weiter einkaufen
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
} 