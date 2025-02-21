'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ShoppingCartIcon } from '@heroicons/react/24/outline'
import { useSession } from 'next-auth/react'

interface AddToCartButtonProps {
  productId: string
}

export default function AddToCartButton({ productId }: AddToCartButtonProps) {
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const { data: session } = useSession()

  const addToCart = async () => {
    if (!session) {
      router.push('/auth/login')
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch('/api/cart', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          productId,
          quantity: 1,
        }),
      })

      if (!response.ok) {
        throw new Error('Fehler beim Hinzufügen zum Warenkorb')
      }

      // Warenkorb aktualisieren
      router.refresh()
      
      // Optional: Erfolgsmeldung anzeigen
      alert('Produkt wurde zum Warenkorb hinzugefügt')
      
    } catch (error) {
      console.error('Fehler:', error)
      alert('Fehler beim Hinzufügen zum Warenkorb')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <button
      type="button"
      onClick={addToCart}
      disabled={isLoading}
      className="flex max-w-xs flex-1 items-center justify-center rounded-md border border-transparent bg-primary-600 px-8 py-3 text-base font-medium text-white hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 focus:ring-offset-gray-50 sm:w-full"
    >
      {isLoading ? (
        <span className="flex items-center">
          <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Wird hinzugefügt...
        </span>
      ) : (
        <span className="flex items-center">
          <ShoppingCartIcon className="mr-2 h-5 w-5" aria-hidden="true" />
          In den Warenkorb
        </span>
      )}
    </button>
  )
} 