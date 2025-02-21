import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import Stripe from 'stripe'
import Link from 'next/link'
import { CheckCircleIcon } from '@heroicons/react/24/outline'

interface SuccessPageProps {
  searchParams: {
    session_id?: string
  }
}

export default async function SuccessPage({ searchParams }: SuccessPageProps) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id || !searchParams.session_id) {
    redirect('/')
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2023-10-16',
  })

  // Stripe Session verifizieren
  const stripeSession = await stripe.checkout.sessions.retrieve(
    searchParams.session_id
  )

  if (stripeSession.payment_status !== 'paid') {
    redirect('/cart')
  }

  // Warenkorb leeren
  await prisma.cart.delete({
    where: { userId: session.user.id },
  })

  // Bestellung in der Datenbank speichern
  const order = await prisma.order.create({
    data: {
      userId: session.user.id,
      stripeSessionId: searchParams.session_id,
      total: stripeSession.amount_total! / 100, // Von Cent in Euro umrechnen
      status: 'PAID',
      shippingAddress: JSON.stringify(stripeSession.shipping_details),
    },
  })

  return (
    <div className="bg-white">
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
        <div className="max-w-xl">
          <div className="flex items-center space-x-2">
            <CheckCircleIcon className="h-8 w-8 text-green-500" />
            <h1 className="text-sm font-medium text-green-500">Zahlung erfolgreich</h1>
          </div>
          <p className="mt-2 text-4xl font-bold tracking-tight sm:text-5xl">
            Danke für Ihre Bestellung
          </p>
          <p className="mt-2 text-base text-gray-500">
            Ihre Bestellung #{order.id} wurde erfolgreich aufgenommen und wird schnellstmöglich bearbeitet.
          </p>

          <dl className="mt-12 text-sm font-medium">
            <dt className="text-gray-900">Bestellnummer</dt>
            <dd className="mt-2 text-primary-600">{order.id}</dd>
          </dl>
        </div>

        <div className="mt-10 border-t border-gray-200">
          <div className="mt-6 flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link
                href="/profile/orders"
                className="rounded-md bg-primary-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-primary-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600"
              >
                Zu meinen Bestellungen
              </Link>
              <Link
                href="/"
                className="text-sm font-medium text-primary-600 hover:text-primary-500"
              >
                Weiter einkaufen
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 