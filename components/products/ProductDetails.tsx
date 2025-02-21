'use client'

import { useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useCart } from '@/hooks/useCart'
import { Product, Category, Brand, Image as ImageType, Variant } from '@prisma/client'

interface ExtendedProduct extends Product {
  category: Category
  brand: Brand
  images: ImageType[]
  variants: Variant[]
}

interface ProductDetailsProps {
  product: ExtendedProduct
}

export default function ProductDetails({ product }: ProductDetailsProps) {
  const router = useRouter()
  const { addToCart } = useCart()
  const [selectedVariant, setSelectedVariant] = useState(product.variants[0]?.id || null)
  const [quantity, setQuantity] = useState(1)
  const [selectedImage, setSelectedImage] = useState(product.images[0]?.url || '/images/placeholder.png')

  const handleAddToCart = () => {
    addToCart({
      productId: product.id,
      variantId: selectedVariant,
      quantity,
      name: product.name,
      price: product.price,
      image: product.images[0]?.url || '/images/placeholder.png',
    })
    router.push('/cart')
  }

  return (
    <div className="lg:grid lg:grid-cols-2 lg:items-start lg:gap-x-8">
      {/* Bildergalerie */}
      <div className="flex flex-col">
        <div className="aspect-h-1 aspect-w-1 w-full">
          <Image
            src={selectedImage}
            alt={product.name}
            width={600}
            height={600}
            className="h-full w-full object-cover object-center rounded-lg"
          />
        </div>
        {product.images.length > 1 && (
          <div className="mt-4 grid grid-cols-4 gap-4">
            {product.images.map((image) => (
              <button
                key={image.id}
                onClick={() => setSelectedImage(image.url)}
                className={`aspect-h-1 aspect-w-1 relative overflow-hidden rounded-lg ${
                  selectedImage === image.url ? 'ring-2 ring-primary-500' : ''
                }`}
              >
                <Image
                  src={image.url}
                  alt=""
                  width={150}
                  height={150}
                  className="h-full w-full object-cover object-center"
                />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Produktinfo */}
      <div className="mt-10 px-4 sm:mt-16 sm:px-0 lg:mt-0">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">
          {product.name}
        </h1>

        <div className="mt-3">
          <h2 className="sr-only">Produktinformationen</h2>
          <p className="text-3xl tracking-tight text-gray-900">
            {product.price.toFixed(2)} €
          </p>
        </div>

        <div className="mt-6">
          <h3 className="sr-only">Beschreibung</h3>
          <div className="space-y-6 text-base text-gray-700">
            {product.description}
          </div>
        </div>

        <div className="mt-6">
          <div className="flex items-center">
            <div className="text-sm text-gray-500">
              Marke: {product.brand.name}
            </div>
            <div className="ml-4 pl-4 border-l border-gray-300 text-sm text-gray-500">
              Kategorie: {product.category.name}
            </div>
          </div>
        </div>

        <form className="mt-6">
          {/* Varianten */}
          {product.variants.length > 0 && (
            <div className="mt-8">
              <h3 className="text-sm font-medium text-gray-900">Variante</h3>
              <div className="mt-2">
                <select
                  value={selectedVariant || ''}
                  onChange={(e) => setSelectedVariant(e.target.value)}
                  className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-primary-600 sm:text-sm sm:leading-6"
                >
                  {product.variants.map((variant) => (
                    <option key={variant.id} value={variant.id}>
                      {variant.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Menge */}
          <div className="mt-8">
            <h3 className="text-sm font-medium text-gray-900">Menge</h3>
            <div className="mt-2">
              <select
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-primary-600 sm:text-sm sm:leading-6"
              >
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                  <option key={num} value={num}>
                    {num}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <button
            type="button"
            onClick={handleAddToCart}
            className="mt-8 flex w-full items-center justify-center rounded-md border border-transparent bg-primary-600 px-8 py-3 text-base font-medium text-white hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
          >
            In den Warenkorb
          </button>
        </form>
      </div>
    </div>
  )
} 