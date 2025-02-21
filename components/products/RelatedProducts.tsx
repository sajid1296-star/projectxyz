import Image from 'next/image'
import Link from 'next/link'
import { Product, Brand, Image as ImageType } from '@prisma/client'

interface ExtendedProduct extends Product {
  brand: Brand
  images: ImageType[]
}

interface RelatedProductsProps {
  products: ExtendedProduct[]
}

export default function RelatedProducts({ products }: RelatedProductsProps) {
  return (
    <div>
      <h2 className="text-2xl font-bold tracking-tight text-gray-900">
        Ähnliche Produkte
      </h2>

      <div className="mt-6 grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-4 xl:gap-x-8">
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
    </div>
  )
} 