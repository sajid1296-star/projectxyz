'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import TradeInForm from '@/components/trade-in/TradeInForm';
import TradeInEstimate from '@/components/trade-in/TradeInEstimate';
import { calculateTradeInValue } from '@/lib/tradeInCalculator';

export default function TradeInPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    deviceType: '',
    brand: '',
    model: '',
    condition: '',
    storage: '',
    accessories: [],
    description: '',
  });

  const handleSubmit = async (data: any) => {
    if (step === 1) {
      const estimatedValue = calculateTradeInValue(data);
      setFormData(data);
      setStep(2);
    } else {
      try {
        const response = await fetch('/api/trade-in', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ...formData,
            ...data,
          }),
        });

        if (!response.ok) throw new Error('Anfrage fehlgeschlagen');

        router.push('/trade-in/success');
      } catch (error) {
        console.error('Trade-in error:', error);
        alert('Ein Fehler ist aufgetreten. Bitte versuchen Sie es später erneut.');
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pt-16 pb-12">
      <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <div className="text-center mb-8">
                <h1 className="text-3xl font-extrabold text-gray-900">
                  Gerät verkaufen
                </h1>
                <p className="mt-2 text-sm text-gray-600">
                  Erhalten Sie eine sofortige Preisschätzung für Ihr Gerät
                </p>
              </div>

              {step === 1 ? (
                <TradeInForm onSubmit={handleSubmit} />
              ) : (
                <TradeInEstimate
                  formData={formData}
                  onSubmit={handleSubmit}
                  onBack={() => setStep(1)}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 