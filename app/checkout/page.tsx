'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCart } from '@/hooks/useCart';
import { useSession } from 'next-auth/react';
import CheckoutForm from '@/components/checkout/CheckoutForm';
import PaymentForm from '@/components/checkout/PaymentForm';

export default function CheckoutPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const { items, total, clearCart } = useCart();
  const [step, setStep] = useState<'details' | 'payment'>('details');
  const [orderDetails, setOrderDetails] = useState<any>(null);

  if (!session) {
    router.push('/auth/login?redirect=/checkout');
    return null;
  }

  if (items.length === 0) {
    router.push('/cart');
    return null;
  }

  const handleCheckoutSubmit = async (details: any) => {
    setOrderDetails(details);
    setStep('payment');
  };

  const handlePaymentSubmit = async (paymentDetails: any) => {
    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items,
          total,
          ...orderDetails,
          ...paymentDetails,
        }),
      });

      if (!response.ok) throw new Error('Bestellung fehlgeschlagen');

      const order = await response.json();
      clearCart();
      router.push(`/orders/${order.id}?success=true`);
    } catch (error) {
      console.error('Checkout error:', error);
      alert('Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut.');
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <div className="grid grid-cols-1 gap-x-16 gap-y-8 lg:grid-cols-5">
        <div className="lg:col-span-3">
          {step === 'details' ? (
            <CheckoutForm onSubmit={handleCheckoutSubmit} />
          ) : (
            <PaymentForm onSubmit={handlePaymentSubmit} total={total} />
          )}
        </div>

        <div className="lg:col-span-2">
          <div className="rounded-lg bg-gray-50 px-4 py-6 sm:p-6 lg:p-8">
            <h2 className="text-lg font-medium text-gray-900">
              Bestellübersicht
            </h2>

            <div className="mt-6 flow-root">
              <ul className="-my-4 divide-y divide-gray-200">
                {items.map((item) => (
                  <li key={`${item.productId}-${item.variantId}`} className="flex items-center space-x-4 py-4">
                    <div className="flex-1">
                      <h3 className="text-sm text-gray-900">{item.name}</h3>
                      <p className="mt-1 text-sm text-gray-500">
                        Menge: {item.quantity}
                      </p>
                    </div>
                    <p className="text-sm font-medium text-gray-900">
                      {(item.price * item.quantity).toFixed(2)} €
                    </p>
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-6 border-t border-gray-200 pt-4">
              <div className="flex items-center justify-between">
                <dt className="text-base font-medium text-gray-900">
                  Gesamtsumme
                </dt>
                <dd className="text-base font-medium text-gray-900">
                  {total.toFixed(2)} €
                </dd>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 