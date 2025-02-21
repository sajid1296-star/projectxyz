'use client';

import { useEffect } from 'react';
import { DeviceType, DeviceCondition } from '@prisma/client';
import { formatCurrency } from '@/lib/utils';

interface PriceEstimatorProps {
  formData: {
    deviceType: DeviceType;
    brand: string;
    model: string;
    condition: DeviceCondition;
    storage: string;
    color: string;
    description: string;
    images: string[];
  };
  estimatedPrice: number | null;
  setEstimatedPrice: (price: number) => void;
  onBack: () => void;
  onSubmit: () => void;
}

export default function PriceEstimator({
  formData,
  estimatedPrice,
  setEstimatedPrice,
  onBack,
  onSubmit
}: PriceEstimatorProps) {
  useEffect(() => {
    const estimatePrice = async () => {
      try {
        const response = await fetch('/api/trade-in/estimate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(formData),
        });

        if (!response.ok) {
          throw new Error('Fehler bei der Preisschätzung');
        }

        const data = await response.json();
        setEstimatedPrice(data.estimatedPrice);
      } catch (error) {
        console.error('Price Estimation Error:', error);
      }
    };

    estimatePrice();
  }, [formData, setEstimatedPrice]);

  const getConditionLabel = (condition: DeviceCondition) => {
    const labels = {
      new: 'Neu',
      likeNew: 'Wie neu',
      good: 'Gut',
      fair: 'Befriedigend',
      poor: 'Schlecht'
    };
    return labels[condition];
  };

  return (
    <div className="space-y-6">
      <div className="bg-gray-50 rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          Zusammenfassung
        </h3>
        <dl className="space-y-3">
          <div className="flex justify-between">
            <dt className="text-sm text-gray-500">Gerätetyp</dt>
            <dd className="text-sm font-medium text-gray-900">
              {formData.deviceType}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-sm text-gray-500">Marke</dt>
            <dd className="text-sm font-medium text-gray-900">
              {formData.brand}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-sm text-gray-500">Modell</dt>
            <dd className="text-sm font-medium text-gray-900">
              {formData.model}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-sm text-gray-500">Zustand</dt>
            <dd className="text-sm font-medium text-gray-900">
              {getConditionLabel(formData.condition)}
            </dd>
          </div>
          {formData.storage && (
            <div className="flex justify-between">
              <dt className="text-sm text-gray-500">Speicher</dt>
              <dd className="text-sm font-medium text-gray-900">
                {formData.storage}
              </dd>
            </div>
          )}
          <div className="pt-4 border-t border-gray-200">
            <div className="flex justify-between">
              <dt className="text-base font-medium text-gray-900">
                Geschätzter Ankaufspreis
              </dt>
              <dd className="text-base font-medium text-blue-600">
                {estimatedPrice ? formatCurrency(estimatedPrice) : 'Wird berechnet...'}
              </dd>
            </div>
          </div>
        </dl>
      </div>

      <div className="bg-yellow-50 rounded-lg p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <p className="text-sm text-yellow-700">
              Dies ist eine vorläufige Schätzung. Der endgültige Ankaufspreis kann nach Prüfung des Geräts abweichen.
            </p>
          </div>
        </div>
      </div>

      <div className="flex justify-between">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex justify-center py-2 px-4 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Zurück
        </button>
        <button
          type="button"
          onClick={onSubmit}
          disabled={!estimatedPrice}
          className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          Ankaufsanfrage absenden
        </button>
      </div>
    </div>
  );
} 