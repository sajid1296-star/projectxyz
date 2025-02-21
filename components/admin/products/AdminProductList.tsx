'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Product, Category, Brand, Image as ImageType, Variant } from '@prisma/client'
import ProductForm from './ProductForm'
import { formatCurrency } from '@/lib/admin'

interface ExtendedProduct extends Product {
  category: Category
  brand: Brand
  images: ImageType[]
  variants: Variant[]
}

interface AdminProductListProps {
  initialProducts: ExtendedProduct[]
  categories: Category[]
  brands: Brand[]
  onImageUpload: (file: File) => Promise<string>
  onImageDelete: (url: string) => Promise<void>
}

export default function AdminProductList({
  initialProducts,
  categories,
  brands,
  onImageUpload,
  onImageDelete,
}: AdminProductListProps) {
  const router = useRouter()
  const [products, setProducts] = useState(initialProducts)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<ExtendedProduct | null>(null)

  const handleSubmit = async (productData: any) => {
    try {
      const response = await fetch('/api/admin/products', {
        method: editingProduct ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(productData),
      })

      if (!response.ok) throw new Error('Fehler beim Speichern')

      const savedProduct = await response.json()
      
      if (editingProduct) {
        setProducts(products.map(p => 
          p.id === savedProduct.id ? savedProduct : p
        ))
      } else {
        setProducts([savedProduct, ...products])
      }

      setIsFormOpen(false)
      setEditingProduct(null)
      router.refresh()
    } catch (error) {
      console.error('Error:', error)
      alert('Ein Fehler ist aufgetreten')
    }
  }

  const handleDelete = async (productId: string) => {
    if (!confirm('Produkt wirklich löschen?')) return

    try {
      const response = await fetch(`/api/admin/products/${productId}`, {
        method: 'DELETE',
      })

      if (!response.ok) throw new Error('Fehler beim Löschen')

      setProducts(products.filter(p => p.id !== productId))
      router.refresh()
    } catch (error) {
      console.error('Error:', error)
      alert('Ein Fehler ist aufgetreten')
    }
  }

  return (
    <div>
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-base font-semibold leading-6 text-gray-900">
            Produkte
          </h1>
        </div>
        <div className="mt-4 sm:ml-16 sm:mt-0 sm:flex-none">
          <button
            onClick={() => {
              setEditingProduct(null)
              setIsFormOpen(true)
            }}
            className="block rounded-md bg-primary-600 px-3 py-2 text-center text-sm font-semibold text-white hover:bg-primary-500"
          >
            Produkt hinzufügen
          </button>
        </div>
      </div>

      {isFormOpen && (
        <ProductForm
          product={editingProduct}
          categories={categories}
          brands={brands}
          onSubmit={handleSubmit}
          onCancel={() => {
            setIsFormOpen(false)
            setEditingProduct(null)
          }}
          onImageUpload={onImageUpload}
          onImageDelete={onImageDelete}
        />
      )}

      <div className="mt-8 flow-root">
        <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
            <table className="min-w-full divide-y divide-gray-300">
              {/* Tabellenkopf und -inhalt hier */}
            </table>
          </div>
        </div>
      </div>
    </div>
  )
} 