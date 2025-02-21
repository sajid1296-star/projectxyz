'use client';

import Image from 'next/image';
import { formatCurrency } from '@/lib/utils';

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
}

interface OrderSummaryProps {
  items: CartItem[];
  shippingCost: number;
  totalAmount: number;
}

export default function OrderSummary({ items, shippingCost, totalAmount }: OrderSummaryProps) {
  return (
    <div className="bg-gray-50 rounded-lg px-4 py-6 sm:p-6 lg:p-8">
      <h2 className="text-lg font-medium text-gray-900">Bestellübersicht</h2>

      <div className="mt-6 space-y-4">
        {items.map((item) => (
          <div key={item.id} className="flex items-center">
            <div className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-md border border-gray-200">
              <Image
                src={item.image || '/placeholder.png'}
                alt={item.name}
                fill
                className="object-cover object-center"
              />
            </div>

            <div className="ml-4 flex flex-1 flex-col">
              <div>
                <div className="flex justify-between text-base font-medium text-gray-900">
                  <h3>{item.name}</h3>
                  <p className="ml-4">{formatCurrency(item.price * item.quantity)}</p>
                </div>
                <p className="mt-1 text-sm text-gray-500">Menge: {item.quantity}</p>
              </div>
            </div>
          </div>
        ))}

        <div className="border-t border-gray-200 pt-4">
          <div className="flex items-center justify-between text-sm">
            <dt className="text-gray-600">Zwischensumme</dt>
            <dd className="font-medium text-gray-900">
              {formatCurrency(items.reduce((sum, item) => sum + item.price * item.quantity, 0))}
            </dd>
          </div>

          <div className="flex items-center justify-between text-sm mt-2">
            <dt className="text-gray-600">Versandkosten</dt>
            <dd className="font-medium text-gray-900">{formatCurrency(shippingCost)}</dd>
          </div>

          <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
            <dt className="text-base font-medium text-gray-900">Gesamtsumme</dt>
            <dd className="text-base font-medium text-gray-900">{formatCurrency(totalAmount)}</dd>
          </div>
        </div>
      </div>

      <div className="mt-6">
        <div className="rounded-md bg-gray-100 p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v5a1 1 0 102 0V7z" clipRule="evenodd" />
              </svg>
            </div>
            <p className="ml-3 text-sm text-gray-500">
              Die Versandkosten werden basierend auf Ihrer Versandart berechnet.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
} 