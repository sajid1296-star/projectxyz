'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { XCircleIcon } from '@heroicons/react/24/outline';

export default function CheckoutError() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const error = searchParams.get('error') || 'Ein unbekannter Fehler ist aufgetreten';

  return (
    <div className="min-h-screen flex items-center justify-center px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 text-center">
        <div>
          <XCircleIcon className="mx-auto h-12 w-12 text-red-500" />
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            Checkout fehlgeschlagen
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            {decodeURIComponent(error)}
          </p>
        </div>

        <div className="flex flex-col space-y-4">
          <button
            onClick={() => router.push('/checkout')}
            className="inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Zurück zum Checkout
          </button>
          
          <button
            onClick={() => router.push('/cart')}
            className="inline-flex justify-center items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Warenkorb überprüfen
          </button>

          <button
            onClick={() => router.push('/')}
            className="inline-flex justify-center items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Zurück zur Startseite
          </button>
        </div>

        <div className="mt-8">
          <p className="text-sm text-gray-500">
            Wenn das Problem weiterhin besteht, kontaktieren Sie bitte unseren Kundenservice.
          </p>
          <a
            href="mailto:support@example.com"
            className="text-sm text-blue-600 hover:text-blue-500"
          >
            support@example.com
          </a>
        </div>
      </div>
    </div>
  );
} 