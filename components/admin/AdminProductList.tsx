'use client'

import { useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { Product, Category, Brand, Image as ProductImage } from '@prisma/client'
import { PencilIcon, TrashIcon } from '@heroicons/react/24/outline'

interface ExtendedProduct extends Product {
  category: Category
  brand: Brand
  images: ProductImage[]
}

interface AdminProductListProps {
  products: ExtendedProduct[]
  categories: Category[]
  brands: Brand[]
}

export default function AdminProductList({ 
  products, 
  categories, 
  brands 
}: AdminProductListProps) {
  const router = useRouter()
  const [deleting, setDeleting] = useState<string | null>(null)

  const deleteProduct = async (productId: string) => {
    if (!confirm('Sind Sie sicher, dass Sie dieses Produkt löschen möchten?')) {
      return
    }

    setDeleting(productId)
    try {
      const response = await fetch(`/api/admin/products/${productId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Löschen fehlgeschlagen')
      }

      router.refresh()
    } catch (error) {
      console.error('Delete error:', error)
      alert('Fehler beim Löschen des Produkts')
    } finally {
      setDeleting(null)
    }
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-300">
        <thead>
          <tr>
            <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900">
              Produkt
            </th>
            <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
              Kategorie
            </th>
            <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
              Marke
            </th>
            <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
              Preis
            </th>
            <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
              Zustand
            </th>
            <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6">
              <span className="sr-only">Aktionen</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {products.map((product) => (
            <tr key={product.id}>
              <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm">
                <div className="flex items-center">
                  <div className="h-10 w-10 flex-shrink-0">
                    <Image
                      src={product.images[0]?.url || '/images/placeholder.jpg'}
                      alt={product.name}
                      width={40}
                      height={40}
                      className="h-10 w-10 rounded-full object-cover"
                    />
                  </div>
                  <div className="ml-4">
                    <div className="font-medium text-gray-900">{product.name}</div>
                    <div className="text-gray-500">{product.id}</div>
                  </div>
                </div>
              </td>
              <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                {product.category.name}
              </td>
              <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                {product.brand.name}
              </td>
              <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                {product.price.toFixed(2)} €
              </td>
              <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                {product.condition}
              </td>
              <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                <button
                  onClick={() => router.push(`/admin/products/${product.id}/edit`)}
                  className="text-primary-600 hover:text-primary-900 mr-4"
                >
                  <PencilIcon className="h-5 w-5" aria-hidden="true" />
                  <span className="sr-only">Bearbeiten</span>
                </button>
                <button
                  onClick={() => deleteProduct(product.id)}
                  disabled={deleting === product.id}
                  className="text-red-600 hover:text-red-900"
                >
                  <TrashIcon className="h-5 w-5" aria-hidden="true" />
                  <span className="sr-only">Löschen</span>
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
} 