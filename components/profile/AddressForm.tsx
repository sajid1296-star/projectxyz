'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Address } from '@prisma/client'
import { useForm } from 'react-hook-form'
import { PlusIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline'

interface AddressFormProps {
  addresses: Address[]
}

interface AddressFormData {
  street: string
  city: string
  postalCode: string
  country: string
  isDefault: boolean
}

export default function AddressForm({ addresses: initialAddresses }: AddressFormProps) {
  const router = useRouter()
  const [addresses, setAddresses] = useState(initialAddresses)
  const [isAdding, setIsAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const { register, handleSubmit, reset, formState: { errors } } = useForm<AddressFormData>()

  const onSubmit = async (data: AddressFormData) => {
    setIsSubmitting(true)
    try {
      const response = await fetch('/api/user/addresses', {
        method: editingId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingId ? { ...data, id: editingId } : data),
      })

      if (!response.ok) throw new Error('Aktion fehlgeschlagen')

      const updatedAddress = await response.json()

      if (editingId) {
        setAddresses(addresses.map(addr => 
          addr.id === editingId ? updatedAddress : addr
        ))
      } else {
        setAddresses([...addresses, updatedAddress])
      }

      setIsAdding(false)
      setEditingId(null)
      reset()
      router.refresh()
    } catch (error) {
      console.error('Error:', error)
      alert('Fehler beim Speichern der Adresse')
    } finally {
      setIsSubmitting(false)
    }
  }

  const deleteAddress = async (id: string) => {
    if (!confirm('Möchten Sie diese Adresse wirklich löschen?')) return

    try {
      const response = await fetch(`/api/user/addresses/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) throw new Error('Löschen fehlgeschlagen')

      setAddresses(addresses.filter(addr => addr.id !== id))
      router.refresh()
    } catch (error) {
      console.error('Error:', error)
      alert('Fehler beim Löschen der Adresse')
    }
  }

  return (
    <div className="divide-y divide-gray-200 px-4 py-6 sm:p-8">
      {/* Adressliste */}
      <div className="space-y-4">
        {addresses.map((address) => (
          <div
            key={address.id}
            className="flex items-center justify-between rounded-lg bg-gray-50 p-4"
          >
            <div>
              <p className="font-medium text-gray-900">
                {address.street}
              </p>
              <p className="text-sm text-gray-500">
                {address.postalCode} {address.city}
              </p>
              <p className="text-sm text-gray-500">
                {address.country}
              </p>
              {address.isDefault && (
                <span className="mt-1 inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                  Standardadresse
                </span>
              )}
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => {
                  setEditingId(address.id)
                  setIsAdding(true)
                  reset(address)
                }}
                className="text-primary-600 hover:text-primary-900"
              >
                <PencilIcon className="h-5 w-5" />
              </button>
              <button
                onClick={() => deleteAddress(address.id)}
                className="text-red-600 hover:text-red-900"
              >
                <TrashIcon className="h-5 w-5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Adressformular */}
      {isAdding ? (
        <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-6">
          <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-6">
            <div className="sm:col-span-4">
              <label htmlFor="street" className="block text-sm font-medium text-gray-700">
                Straße und Hausnummer
              </label>
              <input
                type="text"
                {...register('street', { required: 'Straße ist erforderlich' })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
              />
              {errors.street && (
                <p className="mt-2 text-sm text-red-600">{errors.street.message}</p>
              )}
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="postalCode" className="block text-sm font-medium text-gray-700">
                PLZ
              </label>
              <input
                type="text"
                {...register('postalCode', { required: 'PLZ ist erforderlich' })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
              />
              {errors.postalCode && (
                <p className="mt-2 text-sm text-red-600">{errors.postalCode.message}</p>
              )}
            </div>

            <div className="sm:col-span-3">
              <label htmlFor="city" className="block text-sm font-medium text-gray-700">
                Stadt
              </label>
              <input
                type="text"
                {...register('city', { required: 'Stadt ist erforderlich' })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
              />
              {errors.city && (
                <p className="mt-2 text-sm text-red-600">{errors.city.message}</p>
              )}
            </div>

            <div className="sm:col-span-3">
              <label htmlFor="country" className="block text-sm font-medium text-gray-700">
                Land
              </label>
              <input
                type="text"
                {...register('country', { required: 'Land ist erforderlich' })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
              />
              {errors.country && (
                <p className="mt-2 text-sm text-red-600">{errors.country.message}</p>
              )}
            </div>

            <div className="sm:col-span-6">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  {...register('isDefault')}
                  className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <label htmlFor="isDefault" className="ml-2 block text-sm text-gray-900">
                  Als Standardadresse festlegen
                </label>
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={() => {
                setIsAdding(false)
                setEditingId(null)
                reset()
              }}
              className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-md bg-primary-600 px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
            >
              {isSubmitting ? 'Wird gespeichert...' : editingId ? 'Aktualisieren' : 'Hinzufügen'}
            </button>
          </div>
        </form>
      ) : (
        <button
          onClick={() => setIsAdding(true)}
          className="mt-6 inline-flex items-center text-sm text-primary-600 hover:text-primary-900"
        >
          <PlusIcon className="mr-1.5 h-5 w-5" />
          Neue Adresse
        </button>
      )}
    </div>
  )
} 