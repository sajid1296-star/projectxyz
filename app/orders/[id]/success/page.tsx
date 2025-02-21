import Link from 'next/link'
import { CheckCircleIcon } from '@heroicons/react/24/outline'

export default function OrderSuccessPage() {
  return (
    <div className="bg-white">
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
        <div className="text-center">
          <CheckCircleIcon className="mx-auto h-12 w-12 text-green-600" />
          
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            Vielen Dank für Ihre Bestellung!
          </h1>
          
          <p className="mt-4 text-base text-gray-500">
            Ihre Bestellung wurde erfolgreich aufgenommen. Sie erhalten in Kürze eine Bestätigungs-E-Mail.
          </p>

          <div className="mt-10 flex items-center justify-center gap-x-6">
            <Link
              href="/orders"
              className="rounded-md bg-primary-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-primary-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600"
            >
              Meine Bestellungen
            </Link>
            <Link
              href="/products"
              className="text-sm font-semibold text-gray-900"
            >
              Weiter einkaufen <span aria-hidden="true">&rarr;</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
} 