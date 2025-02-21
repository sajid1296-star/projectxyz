'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Brand } from '@prisma/client'
import { PencilIcon, TrashIcon, PlusIcon } from '@heroicons/react/24/outline'

interface ExtendedBrand extends Brand {
  _count: {
    products: number
  }
}

interface BrandListProps {
  brands: ExtendedBrand[]
}

export default function BrandList({ brands: initialBrands }: BrandListProps) {
  const router = useRouter()
  const [brands, setBrands] = useState(initialBrands)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [newBrand, setNewBrand] = useState('')
  const [isAdding, setIsAdding] = useState(false)
  const [editName, setEditName] = useState('')

  const addBrand = async () => {
    if (!newBrand.trim()) return

    try {
      const response = await fetch('/api/admin/brands', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newBrand }),
      })

      if (!response.ok) throw new Error('Fehler beim Erstellen')

      const brand = await response.json()
      setBrands([...brands, { ...brand, _count: { products: 0 } }])
      setNewBrand('')
      setIsAdding(false)
      router.refresh()
    } catch (error) {
      console.error('Error:', error)
      alert('Fehler beim Erstellen der Marke')
    }
  }

  const updateBrand = async (id: string) => {
    if (!editName.trim()) return

    try {
      const response = await fetch(`/api/admin/brands/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editName }),
      })

      if (!response.ok) throw new Error('Fehler beim Aktualisieren')

      const updatedBrand = await response.json()
      setBrands(brands.map(brand => 
        brand.id === id ? { ...updatedBrand, _count: brand._count } : brand
      ))
      setEditingId(null)
      router.refresh()
    } catch (error) {
      console.error('Error:', error)
      alert('Fehler beim Aktualisieren der Marke')
    }
  }

  const deleteBrand = async (id: string) => {
    if (!confirm('Sind Sie sicher? Alle zugehörigen Produkte werden keiner Marke zugeordnet.')) {
      return
    }

    try {
      const response = await fetch(`/api/admin/brands/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) throw new Error('Fehler beim Löschen')

      setBrands(brands.filter(brand => brand.id !== id))
      router.refresh()
    } catch (error) {
      console.error('Error:', error)
      alert('Fehler beim Löschen der Marke')
    }
  }

  return (
    <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg">
      <table className="min-w-full divide-y divide-gray-300">
        <thead className="bg-gray-50">
          <tr>
            <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900">
              Name
            </th>
            <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
              Produkte
            </th>
            <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6">
              <span className="sr-only">Aktionen</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 bg-white">
          {brands.map((brand) => (
            <tr key={brand.id}>
              <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900">
                {editingId === brand.id ? (
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                    onKeyPress={(e) => e.key === 'Enter' && updateBrand(brand.id)}
                  />
                ) : (
                  brand.name
                )}
              </td>
              <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                {brand._count.products}
              </td>
              <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                {editingId === brand.id ? (
                  <button
                    onClick={() => updateBrand(brand.id)}
                    className="text-primary-600 hover:text-primary-900"
                  >
                    Speichern
                  </button>
                ) : (
                  <div className="flex justify-end space-x-4">
                    <button
                      onClick={() => {
                        setEditingId(brand.id)
                        setEditName(brand.name)
                      }}
                      className="text-primary-600 hover:text-primary-900"
                    >
                      <PencilIcon className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => deleteBrand(brand.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      <TrashIcon className="h-5 w-5" />
                    </button>
                  </div>
                )}
              </td>
            </tr>
          ))}
          {/* Neue Marke hinzufügen */}
          <tr>
            <td colSpan={3} className="px-4 py-4">
              {isAdding ? (
                <div className="flex items-center space-x-4">
                  <input
                    type="text"
                    value={newBrand}
                    onChange={(e) => setNewBrand(e.target.value)}
                    placeholder="Neue Marke"
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                    onKeyPress={(e) => e.key === 'Enter' && addBrand()}
                  />
                  <button
                    onClick={addBrand}
                    className="inline-flex items-center rounded-md border border-transparent bg-primary-600 px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
                  >
                    Hinzufügen
                  </button>
                  <button
                    onClick={() => {
                      setIsAdding(false)
                      setNewBrand('')
                    }}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    Abbrechen
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setIsAdding(true)}
                  className="inline-flex items-center text-sm text-primary-600 hover:text-primary-900"
                >
                  <PlusIcon className="mr-1.5 h-5 w-5" />
                  Neue Marke
                </button>
              )}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  )
} 