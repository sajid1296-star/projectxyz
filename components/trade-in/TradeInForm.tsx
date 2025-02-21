'use client';
import React, { ChangeEvent, useState } from 'react';
import { DeviceType, DeviceCondition } from '@prisma/client';

const deviceTypes = [
  { id: 'smartphone', name: 'Smartphone' },
  { id: 'tablet', name: 'Tablet' },
  { id: 'laptop', name: 'Laptop' },
  { id: 'smartwatch', name: 'Smartwatch' },
];

const brands = {
  smartphone: ['Apple', 'Samsung', 'Google', 'Huawei'],
  tablet: ['Apple', 'Samsung', 'Lenovo', 'Microsoft'],
  laptop: ['Apple', 'Dell', 'HP', 'Lenovo'],
  smartwatch: ['Apple', 'Samsung', 'Garmin', 'Fitbit'],
};

const conditions: DeviceCondition[] = [
  { id: 'new', name: 'Wie neu', description: 'Keine Gebrauchsspuren' },
  { id: 'very_good', name: 'Sehr gut', description: 'Minimale Gebrauchsspuren' },
  { id: 'good', name: 'Gut', description: 'Normale Gebrauchsspuren' },
  { id: 'fair', name: 'Akzeptabel', description: 'Deutliche Gebrauchsspuren' },
];

interface TradeInFormProps {
  onSubmit: (data: any) => void;
}

export default function TradeInForm({ onSubmit }: TradeInFormProps) {
  const [formData, setFormData] = useState({
    deviceType: '',
    brand: '',
    model: '',
    condition: '',
    storage: '',
    accessories: [] as string[],
    description: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <div className="space-y-6">
        {/* Gerätetyp */}
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Gerätetyp
          </label>
          <select
            required
            value={formData.deviceType}
            onChange={(e) =>
              setFormData({
                ...formData,
                deviceType: e.target.value,
                brand: '',
                model: '',
              })
            }
            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
          >
            <option value="">Bitte wählen</option>
            {deviceTypes.map((type) => (
              <option key={type.id} value={type.id}>
                {type.name}
              </option>
            ))}
          </select>
        </div>

        {/* Marke */}
        {formData.deviceType && (
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Marke
            </label>
            <select
              required
              value={formData.brand}
              onChange={(e) =>
                setFormData({ ...formData, brand: e.target.value, model: '' })
              }
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
            >
              <option value="">Bitte wählen</option>
              {brands[formData.deviceType as keyof typeof brands].map((brand) => (
                <option key={brand} value={brand}>
                  {brand}
                </option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Modell
          </label>
          <input
            type="text"
            value={formData.model}
            onChange={handleInputChange}
            name="model"
            required
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            placeholder="z.B. iPhone 13 Pro, Galaxy S21, etc."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Zustand
          </label>
          <select
            value={formData.condition}
            onChange={handleInputChange}
            name="condition"
            required
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          >
            <option value="">Bitte wählen</option>
            {conditions.map((condition) => (
              <option key={condition.id} value={condition.id}>
                {condition.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Speichergröße
          </label>
          <input
            type="text"
            value={formData.storage}
            onChange={handleInputChange}
            name="storage"
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            placeholder="z.B. 128GB, 256GB, etc."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Beschreibung
          </label>
          <textarea
            value={formData.description}
            onChange={handleInputChange}
            name="description"
            rows={4}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            placeholder="Zusätzliche Details zum Zustand, Zubehör, etc."
          />
        </div>

        <button
          type="submit"
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Weiter zur Preisschätzung
        </button>
      </div>
    </form>
  );
} 