'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface DiscountFormProps {
  cartTotal: number
  items: any[]
  onApplyDiscount: (discount: any) => void
}

export default function DiscountForm({
  cartTotal,
  items,
  onApplyDiscount
}: DiscountFormProps) {
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await fetch(
        `/api/discounts?code=${code}&cartTotal=${cartTotal}&items=${JSON.stringify(items)}`
      )

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error)
      }

      const discount = await response.json()
      onApplyDiscount(discount)
      setCode('')
    } catch (error: any) {
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6">
      <div className="flex space-x-4">
        <input
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Gutscheincode eingeben"
          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
        />
        <button
          type="submit"
          disabled={loading || !code}
          className="inline-flex items-center rounded-md border border-transparent bg-primary-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50"
        >
          {loading ? 'Wird geprüft...' : 'Einlösen'}
        </button>
      </div>
      {error && (
        <p className="mt-2 text-sm text-red-600">
          {error}
        </p>
      )}
    </form>
  )
} 