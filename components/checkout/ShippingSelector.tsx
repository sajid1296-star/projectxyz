'use client'

import { useState, useEffect } from 'react'
import { RadioGroup } from '@headlessui/react'
import { TruckIcon, CalendarIcon } from '@heroicons/react/24/outline'

interface ShippingOption {
  id: string
  name: string
  price: number
  estimatedDays: {
    min: number
    max: number
  }
}

interface ShippingSelectorProps {
  countryCode: string
  items: any[]
  cartTotal: number
  onSelect: (option: ShippingOption) => void
}

export default function ShippingSelector({
  countryCode,
  items,
  cartTotal,
  onSelect
}: ShippingSelectorProps) {
  const [options, setOptions] = useState<ShippingOption[]>([])
  const [selected, setSelected] = useState<ShippingOption | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchOptions = async () => {
      try {
        const response = await fetch('/api/shipping/calculate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ countryCode, items, cartTotal })
        })

        if (!response.ok) throw new Error('Fehler beim Laden der Versandoptionen')

        const data = await response.json()
        setOptions(data)
        if (data.length > 0) {
          setSelected(data[0])
          onSelect(data[0])
        }
      } catch (error: any) {
        setError(error.message)
      } finally {
        setLoading(false)
      }
    }

    fetchOptions()
  }, [countryCode, items, cartTotal])

  if (loading) {
    return <div className="animate-pulse">Lade Versandoptionen...</div>
  }

  if (error) {
    return <div className="text-red-600">{error}</div>
  }

  return (
    <RadioGroup value={selected} onChange={(option) => {
      setSelected(option)
      onSelect(option)
    }}>
      <div className="space-y-4">
        {options.map((option) => (
          <RadioGroup.Option
            key={option.id}
            value={option}
            className={({ checked }) =>
              `${checked ? 'border-primary-500 ring-2 ring-primary-500' : 'border-gray-300'}
               relative flex cursor-pointer rounded-lg border p-4 shadow-sm focus:outline-none`
            }
          >
            {({ checked }) => (
              <>
                <div className="flex w-full items-center justify-between">
                  <div className="flex items-center">
                    <div className="text-sm">
                      <RadioGroup.Label as="p" className="font-medium text-gray-900">
                        {option.name}
                      </RadioGroup.Label>
                      <RadioGroup.Description as="div" className="text-gray-500">
                        <p className="flex items-center space-x-2">
                          <CalendarIcon className="h-4 w-4" />
                          <span>
                            {option.estimatedDays.min}-{option.estimatedDays.max} Werktage
                          </span>
                        </p>
                      </RadioGroup.Description>
                    </div>
                  </div>
                  <RadioGroup.Description as="span" className="text-sm font-medium text-gray-900">
                    {option.price === 0 ? (
                      <span className="text-green-600">Kostenlos</span>
                    ) : (
                      `${option.price.toFixed(2)} €`
                    )}
                  </RadioGroup.Description>
                </div>
              </>
            )}
          </RadioGroup.Option>
        ))}
      </div>
    </RadioGroup>
  )
} 