'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Category } from '@prisma/client'
import { PencilIcon, TrashIcon, PlusIcon } from '@heroicons/react/24/outline'

interface ExtendedCategory extends Category {
  _count: {
    products: number
  }
}

interface CategoryListProps {
  categories: ExtendedCategory[]
}

export default function CategoryList({ categories: initialCategories }: CategoryListProps) {
  const router = useRouter()
  const [categories, setCategories] = useState(initialCategories)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [newCategory, setNewCategory] = useState('')
  const [isAdding, setIsAdding] = useState(false)
  const [editName, setEditName] = useState('')

  const addCategory = async () => {
    if (!newCategory.trim()) return

    try {
      const response = await fetch('/api/admin/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newCategory }),
      })

      if (!response.ok) throw new Error('Fehler beim Erstellen')

      const category = await response.json()
      setCategories([...categories, { ...category, _count: { products: 0 } }])
      setNewCategory('')
      setIsAdding(false)
      router.refresh()
    } catch (error) {
      console.error('Error:', error)
      alert('Fehler beim Erstellen der Kategorie')
    }
  }

  const updateCategory = async (id: string) => {
    if (!editName.trim()) return

    try {
      const response = await fetch(`/api/admin/categories/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editName }),
      })

      if (!response.ok) throw new Error('Fehler beim Aktualisieren')

      const updatedCategory = await response.json()
      setCategories(categories.map(cat => 
        cat.id === id ? { ...updatedCategory, _count: cat._count } : cat
      ))
      setEditingId(null)
      router.refresh()
    } catch (error) {
      console.error('Error:', error)
      alert('Fehler beim Aktualisieren der Kategorie')
    }
  }

  const deleteCategory = async (id: string) => {
    if (!confirm('Sind Sie sicher? Alle zugehörigen Produkte werden keiner Kategorie zugeordnet.')) {
      return
    }

    try {
      const response = await fetch(`/api/admin/categories/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) throw new Error('Fehler beim Löschen')

      setCategories(categories.filter(cat => cat.id !== id))
      router.refresh()
    } catch (error) {
      console.error('Error:', error)
      alert('Fehler beim Löschen der Kategorie')
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
          {categories.map((category) => (
            <tr key={category.id}>
              <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900">
                {editingId === category.id ? (
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                    onKeyPress={(e) => e.key === 'Enter' && updateCategory(category.id)}
                  />
                ) : (
                  category.name
                )}
              </td>
              <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                {category._count.products}
              </td>
              <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                {editingId === category.id ? (
                  <button
                    onClick={() => updateCategory(category.id)}
                    className="text-primary-600 hover:text-primary-900"
                  >
                    Speichern
                  </button>
                ) : (
                  <div className="flex justify-end space-x-4">
                    <button
                      onClick={() => {
                        setEditingId(category.id)
                        setEditName(category.name)
                      }}
                      className="text-primary-600 hover:text-primary-900"
                    >
                      <PencilIcon className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => deleteCategory(category.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      <TrashIcon className="h-5 w-5" />
                    </button>
                  </div>
                )}
              </td>
            </tr>
          ))}
          {/* Neue Kategorie hinzufügen */}
          <tr>
            <td colSpan={3} className="px-4 py-4">
              {isAdding ? (
                <div className="flex items-center space-x-4">
                  <input
                    type="text"
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    placeholder="Neue Kategorie"
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                    onKeyPress={(e) => e.key === 'Enter' && addCategory()}
                  />
                  <button
                    onClick={addCategory}
                    className="inline-flex items-center rounded-md border border-transparent bg-primary-600 px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
                  >
                    Hinzufügen
                  </button>
                  <button
                    onClick={() => {
                      setIsAdding(false)
                      setNewCategory('')
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
                  Neue Kategorie
                </button>
              )}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  )
} 