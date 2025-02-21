'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Image as ProductImage } from '@prisma/client'
import clsx from 'clsx'

interface ProductImageGalleryProps {
  images: ProductImage[]
}

export default function ProductImageGallery({ images }: ProductImageGalleryProps) {
  const [selectedImage, setSelectedImage] = useState(images[0])

  return (
    <div className="flex flex-col-reverse">
      {/* Bildvorschau */}
      <div className="mx-auto mt-6 hidden w-full max-w-2xl sm:block lg:max-w-none">
        <div className="grid grid-cols-4 gap-6" aria-orientation="horizontal" role="tablist">
          {images.map((image) => (
            <button
              key={image.id}
              onClick={() => setSelectedImage(image)}
              className={clsx(
                'relative flex h-24 cursor-pointer items-center justify-center rounded-md bg-white text-sm font-medium uppercase text-gray-900 hover:bg-gray-50 focus:outline-none focus:ring focus:ring-primary-500 focus:ring-offset-4',
                {
                  'ring-2 ring-primary-500 ring-offset-2': selectedImage.id === image.id,
                }
              )}
              role="tab"
              aria-selected={selectedImage.id === image.id}
              aria-controls={`tabs-${image.id}-panel`}
            >
              <span className="sr-only">{image.alt}</span>
              <span className="absolute inset-0 overflow-hidden rounded-md">
                <Image
                  src={image.url}
                  alt={image.alt || ''}
                  width={200}
                  height={200}
                  className="h-full w-full object-cover object-center"
                />
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Hauptbild */}
      <div className="aspect-h-1 aspect-w-1 w-full">
        <div
          id={`tabs-${selectedImage.id}-panel`}
          aria-labelledby={`tabs-${selectedImage.id}-tab`}
          role="tabpanel"
          tabIndex={0}
        >
          <Image
            src={selectedImage.url}
            alt={selectedImage.alt || ''}
            width={1000}
            height={1000}
            className="h-full w-full object-cover object-center sm:rounded-lg"
          />
        </div>
      </div>
    </div>
  )
} 