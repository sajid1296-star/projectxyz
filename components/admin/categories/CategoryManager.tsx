'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Category, CategoryMetadata } from '@prisma/client'
import CategoryForm from './CategoryForm'
import CategoryTree from './CategoryTree'

interface ExtendedCategory extends Category {
  parent: Category | null
  children: Category[]
  metadata: CategoryMetadata[]
  _count: {
    products: number
  }
}

interface CategoryManagerProps {
  categories: ExtendedCategory[]
  productCounts: any[]
}

export default function CategoryManager({ 
  categories, 
  productCounts 
}: CategoryManagerProps) {
  const router = useRouter()
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<ExtendedCategory | null>(null)

  const handleSubmit = async (data: any) => {
    try {
      const response = await fetch('/api/admin/categories', {
        method: editingCategory ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })

      if (!response.ok) throw new Error('Fehler beim Speichern')

      setIsFormOpen(false)
      setEditingCategory(null)
      router.refresh()
    } catch (error) {
      console.error('Error:', error)
      alert('Ein Fehler ist aufgetreten')
    }
  }

  const handleMove = async (categoryId: string, newParentId: string | null) => {
    try {
      await fetch(`/api/admin/categories/${categoryId}/move`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ parentId: newParentId })
      })
      
      router.refresh()
    } catch (error) {
      console.error('Error:', error)
      alert('Ein Fehler ist aufgetreten')
    }
  }

  return (
    <div className="bg-white shadow sm:rounded-lg">
      <div className="px-4 py-5 sm:p-6">
        <div className="sm:flex sm:items-center">
          <div className="sm:flex-auto">
            <h2 className="text-base font-semibold leading-6 text-gray-900">
              Kategorien
            </h2>
          </div>
          <div className="mt-4 sm:ml-16 sm:mt-0">
            <button
              onClick={() => {
                setEditingCategory(null)
                setIsFormOpen(true)
              }}
              className="block rounded-md bg-primary-600 px-3 py-2 text-sm font-semibold text-white hover:bg-primary-500"
            >
              Kategorie hinzufügen
            </button>
          </div>
        </div>

        {isFormOpen && (
          <CategoryForm
            category={editingCategory}
            categories={categories}
            onSubmit={handleSubmit}
            onCancel={() => {
              setIsFormOpen(false)
              setEditingCategory(null)
            }}
          />
        )}

        <div className="mt-6">
          <CategoryTree
            categories={categories}
            productCounts={productCounts}
            onEdit={setEditingCategory}
            onMove={handleMove}
          />
        </div>
      </div>
    </div>
  )
} 