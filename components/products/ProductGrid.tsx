'use client'

import Image from 'next/image'
import Link from 'next/link'
import { Product, Category, Brand, Image as ImageType } from '@prisma/client'
import Pagination from '@/components/layout/Pagination'

interface ExtendedProduct extends Product {
  category: Category
  brand: Brand
  images: ImageType[]
}

interface ProductGridProps {
  products: ExtendedProduct[]
  total: number
  currentPage: number
  pageSize: number
}

export default function ProductGrid({ products, total, currentPage, pageSize }: ProductGridProps) {
  if (products.length === 0) {
    return (
      <div className="text-center">
        <p className="text-sm text-gray-500">
          Keine Produkte gefunden.
        </p>
      </div>
    )
  }

  return (
    <div>
      <div className="grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {products.map((product) => (
          <Link 
            key={product.id} 
            href={`/products/${product.id}`}
            className="group relative"
          >
            <div className="aspect-h-1 aspect-w-1 w-full overflow-hidden rounded-lg bg-gray-200">
              <Image
                src={product.images[0]?.url || '/images/placeholder.png'}
                alt={product.name}
                width={500}
                height={500}
                className="h-full w-full object-cover object-center group-hover:opacity-75"
              />
            </div>
            <div className="mt-4 flex justify-between">
              <div>
                <h3 className="text-sm text-gray-700">
                  {product.name}
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  {product.brand.name}
                </p>
              </div>
              <p className="text-sm font-medium text-gray-900">
                {product.price.toFixed(2)} €
              </p>
            </div>
          </Link>
        ))}
      </div>

      <div className="mt-8">
        <Pagination
          totalItems={total}
          itemsPerPage={pageSize}
          currentPage={currentPage}
          baseUrl="/products"
        />
      </div>
    </div>
  )
} 