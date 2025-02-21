'use client'

import { useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { CartItem, Product, Image as ProductImage } from '@prisma/client'
import { XMarkIcon } from '@heroicons/react/20/solid'

interface ExtendedCartItem extends CartItem {
  product: Product & {
    images: ProductImage[]
  }
}

interface CartItemsProps {
  items: ExtendedCartItem[]
}

export default function CartItems({ items }: CartItemsProps) {
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)

  const updateQuantity = async (itemId: string, newQuantity: number) => {
    if (newQuantity < 1) return
    setLoading(itemId)
    
    try {
      const response = await fetch(`/api/cart/items/${itemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity: newQuantity }),
      })

      if (!response.ok) throw new Error('Update fehlgeschlagen')
      
      router.refresh()
    } catch (error) {
      console.error('Fehler beim Update:', error)
      alert('Fehler beim Aktualisieren der Menge')
    } finally {
      setLoading(null)
    }
  }

  const removeItem = async (itemId: string) => {
    setLoading(itemId)
    
    try {
      const response = await fetch(`/api/cart/items/${itemId}`, {
        method: 'DELETE',
      })

      if (!response.ok) throw new Error('Löschen fehlgeschlagen')
      
      router.refresh()
    } catch (error) {
      console.error('Fehler beim Löschen:', error)
      alert('Fehler beim Entfernen des Artikels')
    } finally {
      setLoading(null)
    }
  }

  return (
    <ul role="list" className="divide-y divide-gray-200 border-b border-t border-gray-200">
      {items.map((item) => (
        <li key={item.id} className="flex py-6 sm:py-10">
          <div className="flex-shrink-0">
            <Image
              src={item.product.images[0]?.url || '/images/placeholder.jpg'}
              alt={item.product.name}
              width={200}
              height={200}
              className="h-24 w-24 rounded-md object-cover object-center sm:h-48 sm:w-48"
            />
          </div>

          <div className="ml-4 flex flex-1 flex-col justify-between sm:ml-6">
            <div className="relative pr-9 sm:grid sm:grid-cols-2 sm:gap-x-6 sm:pr-0">
              <div>
                <div className="flex justify-between">
                  <h3 className="text-sm">
                    {item.product.name}
                  </h3>
                </div>
                <p className="mt-1 text-sm font-medium text-gray-900">
                  {item.product.price.toFixed(2)} €
                </p>
              </div>

              <div className="mt-4 sm:mt-0 sm:pr-9">
                <label htmlFor={`quantity-${item.id}`} className="sr-only">
                  Menge
                </label>
                <select
                  id={`quantity-${item.id}`}
                  name={`quantity-${item.id}`}
                  value={item.quantity}
                  onChange={(e) => updateQuantity(item.id, Number(e.target.value))}
                  className="max-w-full rounded-md border border-gray-300 py-1.5 text-left text-base font-medium leading-5 text-gray-700 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 sm:text-sm"
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((num) => (
                    <option key={num} value={num}>
                      {num}
                    </option>
                  ))}
                </select>

                <div className="absolute right-0 top-0">
                  <button
                    type="button"
                    onClick={() => removeItem(item.id)}
                    className="-m-2 inline-flex p-2 text-gray-400 hover:text-gray-500"
                  >
                    <span className="sr-only">Entfernen</span>
                    <XMarkIcon className="h-5 w-5" aria-hidden="true" />
                  </button>
                </div>
              </div>
            </div>

            {loading === item.id && (
              <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-50">
                <div className="spinner"></div>
              </div>
            )}
          </div>
        </li>
      ))}
    </ul>
  )
} 