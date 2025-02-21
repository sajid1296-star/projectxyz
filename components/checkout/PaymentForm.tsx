'use client'

import { useState } from 'react'
import { useStripe, useElements, PaymentElement } from '@stripe/stripe-react-js'
import { PayPalButtons } from '@paypal/react-paypal-js'
import { useRouter } from 'next/navigation'

interface PaymentFormProps {
  orderId: string
  amount: number
  currency: string
}

export default function PaymentForm({
  orderId,
  amount,
  currency
}: PaymentFormProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const stripe = useStripe()
  const elements = useElements()
  const router = useRouter()

  const handleStripeSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!stripe || !elements) return

    setLoading(true)
    setError(null)

    try {
      const { error: submitError } = await elements.submit()
      if (submitError) throw submitError

      const response = await fetch('/api/payments/create-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId,
          amount,
          currency,
          paymentMethod: 'card'
        })
      })

      const { clientSecret } = await response.json()

      const { error: confirmError } = await stripe.confirmPayment({
        elements,
        clientSecret,
        confirmParams: {
          return_url: `${window.location.origin}/checkout/complete`
        }
      })

      if (confirmError) throw confirmError
    } catch (error: any) {
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  const handlePayPalApproval = async (data: any) => {
    try {
      const response = await fetch('/api/payments/capture-paypal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId,
          paypalOrderId: data.orderID
        })
      })

      if (!response.ok) throw new Error('Zahlung fehlgeschlagen')

      router.push('/checkout/complete')
    } catch (error: any) {
      setError(error.message)
    }
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-md bg-red-50 p-4">
          <div className="text-sm text-red-700">{error}</div>
        </div>
      )}

      {/* Stripe Kreditkarte */}
      <form onSubmit={handleStripeSubmit}>
        <PaymentElement />
        <button
          type="submit"
          disabled={loading || !stripe}
          className="mt-4 w-full rounded-md bg-primary-600 px-4 py-2 text-white"
        >
          {loading ? 'Verarbeite...' : 'Mit Karte zahlen'}
        </button>
      </form>

      {/* PayPal */}
      <div className="mt-4">
        <PayPalButtons
          createOrder={(data, actions) => {
            return actions.order.create({
              purchase_units: [{
                amount: {
                  currency_code: currency,
                  value: amount.toString()
                }
              }]
            })
          }}
          onApprove={(data, actions) => handlePayPalApproval(data)}
        />
      </div>
    </div>
  )
} 