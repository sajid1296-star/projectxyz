'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface CartSummaryProps {
  subtotal: number
}

export default function CartSummary({ subtotal }: CartSummaryProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  
  const shipping = 4.95
  const total = subtotal + shipping

  const handleCheckout = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/checkout/create-session', {
        method: 'POST',
      })

      if (!response.ok) {
        throw new Error('Checkout fehlgeschlagen')
      }

      const { url } = await response.json()
      router.push(url)
    } catch (error) {
      console.error('Checkout error:', error)
      alert('Ein Fehler ist beim Checkout aufgetreten')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <section
      aria-labelledby="summary-heading"
      className="mt-16 rounded-lg bg-gray-50 px-4 py-6 sm:p-6 lg:col-span-5 lg:mt-0 lg:p-8"
    >
      <h2 id="summary-heading" className="text-lg font-medium text-gray-900">
        Bestellübersicht
      </h2>

      <dl className="mt-6 space-y-4">
        <div className="flex items-center justify-between">
          <dt className="text-sm text-gray-600">Zwischensumme</dt>
          <dd className="text-sm font-medium text-gray-900">{subtotal.toFixed(2)} €</dd>
        </div>
        
        <div className="flex items-center justify-between border-t border-gray-200 pt-4">
          <dt className="text-sm text-gray-600">Versandkosten</dt>
          <dd className="text-sm font-medium text-gray-900">{shipping.toFixed(2)} €</dd>
        </div>
        
        <div className="flex items-center justify-between border-t border-gray-200 pt-4">
          <dt className="text-base font-medium text-gray-900">Gesamtsumme</dt>
          <dd className="text-base font-medium text-gray-900">{total.toFixed(2)} €</dd>
        </div>
      </dl>

      <div className="mt-6">
        <button
          type="button"
          onClick={handleCheckout}
          disabled={isLoading}
          className="w-full rounded-md border border-transparent bg-primary-600 px-4 py-3 text-base font-medium text-white shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 focus:ring-offset-gray-50"
        >
          {isLoading ? (
            <span className="flex items-center justify-center">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Wird geladen...
            </span>
          ) : (
            'Zur Kasse'
          )}
        </button>
      </div>
    </section>
  )
} 