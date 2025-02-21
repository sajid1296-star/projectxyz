'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Product, Category, Brand } from '@prisma/client'
import { useForm } from 'react-hook-form'
import { PhotoIcon, XMarkIcon } from '@heroicons/react/24/solid'

interface ProductFormProps {
  product?: Product
  categories: Category[]
  brands: Brand[]
}

interface ProductFormData {
  name: string
  description: string
  price: number
  categoryId: string
  brandId: string
  condition: string
  warranty?: string
  images: FileList
}

export default function ProductForm({ product, categories, brands }: ProductFormProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [imageUrls, setImageUrls] = useState<string[]>(
    product?.images?.map(img => img.url) || []
  )

  const { register, handleSubmit, formState: { errors } } = useForm<ProductFormData>({
    defaultValues: product || {
      name: '',
      description: '',
      price: 0,
      categoryId: '',
      brandId: '',
      condition: 'NEW',
      warranty: '',
    },
  })

  const onSubmit = async (data: ProductFormData) => {
    setIsSubmitting(true)
    try {
      // Bilder zuerst hochladen
      const imageFiles = Array.from(data.images || [])
      const uploadedImageUrls = []

      for (const file of imageFiles) {
        const formData = new FormData()
        formData.append('file', file)

        const uploadRes = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        })

        if (!uploadRes.ok) throw new Error('Bilderupload fehlgeschlagen')
        
        const { url } = await uploadRes.json()
        uploadedImageUrls.push(url)
      }

      // Produkt erstellen/aktualisieren
      const endpoint = product 
        ? `/api/admin/products/${product.id}`
        : '/api/admin/products'
      
      const response = await fetch(endpoint, {
        method: product ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          price: Number(data.price),
          images: [...imageUrls, ...uploadedImageUrls],
        }),
      })

      if (!response.ok) {
        throw new Error('Fehler beim Speichern des Produkts')
      }

      router.push('/admin/products')
      router.refresh()
    } catch (error) {
      console.error('Submit error:', error)
      alert('Ein Fehler ist aufgetreten')
    } finally {
      setIsSubmitting(false)
    }
  }

  const removeImage = (index: number) => {
    setImageUrls(urls => urls.filter((_, i) => i !== index))
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8 divide-y divide-gray-200">
      <div className="space-y-8 divide-y divide-gray-200">
        <div>
          <div>
            <h3 className="text-lg font-medium leading-6 text-gray-900">
              {product ? 'Produkt bearbeiten' : 'Neues Produkt'}
            </h3>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
            <div className="sm:col-span-4">
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                Name
              </label>
              <div className="mt-1">
                <input
                  type="text"
                  {...register('name', { required: 'Name ist erforderlich' })}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                />
                {errors.name && (
                  <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
                )}
              </div>
            </div>

            <div className="sm:col-span-6">
              <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                Beschreibung
              </label>
              <div className="mt-1">
                <textarea
                  {...register('description', { required: 'Beschreibung ist erforderlich' })}
                  rows={3}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                />
                {errors.description && (
                  <p className="mt-1 text-sm text-red-600">{errors.description.message}</p>
                )}
              </div>
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="price" className="block text-sm font-medium text-gray-700">
                Preis (€)
              </label>
              <div className="mt-1">
                <input
                  type="number"
                  step="0.01"
                  {...register('price', { 
                    required: 'Preis ist erforderlich',
                    min: { value: 0, message: 'Preis muss positiv sein' }
                  })}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                />
                {errors.price && (
                  <p className="mt-1 text-sm text-red-600">{errors.price.message}</p>
                )}
              </div>
            </div>

            <div className="sm:col-span-3">
              <label htmlFor="categoryId" className="block text-sm font-medium text-gray-700">
                Kategorie
              </label>
              <div className="mt-1">
                <select
                  {...register('categoryId', { required: 'Kategorie ist erforderlich' })}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                >
                  <option value="">Bitte wählen</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
                {errors.categoryId && (
                  <p className="mt-1 text-sm text-red-600">{errors.categoryId.message}</p>
                )}
              </div>
            </div>

            <div className="sm:col-span-3">
              <label htmlFor="brandId" className="block text-sm font-medium text-gray-700">
                Marke
              </label>
              <div className="mt-1">
                <select
                  {...register('brandId', { required: 'Marke ist erforderlich' })}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                >
                  <option value="">Bitte wählen</option>
                  {brands.map((brand) => (
                    <option key={brand.id} value={brand.id}>
                      {brand.name}
                    </option>
                  ))}
                </select>
                {errors.brandId && (
                  <p className="mt-1 text-sm text-red-600">{errors.brandId.message}</p>
                )}
              </div>
            </div>

            <div className="sm:col-span-3">
              <label htmlFor="condition" className="block text-sm font-medium text-gray-700">
                Zustand
              </label>
              <div className="mt-1">
                <select
                  {...register('condition', { required: 'Zustand ist erforderlich' })}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                >
                  <option value="NEW">Neu</option>
                  <option value="LIKE_NEW">Wie neu</option>
                  <option value="GOOD">Gut</option>
                  <option value="FAIR">Akzeptabel</option>
                </select>
                {errors.condition && (
                  <p className="mt-1 text-sm text-red-600">{errors.condition.message}</p>
                )}
              </div>
            </div>

            <div className="sm:col-span-6">
              <label htmlFor="images" className="block text-sm font-medium text-gray-700">
                Produktbilder
              </label>
              <div className="mt-1 flex justify-center rounded-md border-2 border-dashed border-gray-300 px-6 pt-5 pb-6">
                <div className="space-y-1 text-center">
                  <PhotoIcon className="mx-auto h-12 w-12 text-gray-400" />
                  <div className="flex text-sm text-gray-600">
                    <label
                      htmlFor="images"
                      className="relative cursor-pointer rounded-md bg-white font-medium text-primary-600 focus-within:outline-none focus-within:ring-2 focus-within:ring-primary-500 focus-within:ring-offset-2 hover:text-primary-500"
                    >
                      <span>Bilder hochladen</span>
                      <input
                        id="images"
                        type="file"
                        multiple
                        accept="image/*"
                        className="sr-only"
                        {...register('images')}
                      />
                    </label>
                  </div>
                  <p className="text-xs text-gray-500">PNG, JPG bis 10MB</p>
                </div>
              </div>
            </div>

            {/* Vorschau der vorhandenen Bilder */}
            {imageUrls.length > 0 && (
              <div className="sm:col-span-6">
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
                  {imageUrls.map((url, index) => (
                    <div key={index} className="relative">
                      <img
                        src={url}
                        alt={`Produkt ${index + 1}`}
                        className="h-24 w-24 rounded-md object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => removeImage(index)}
                        className="absolute -right-2 -top-2 rounded-full bg-red-500 p-1 text-white hover:bg-red-600"
                      >
                        <XMarkIcon className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="pt-5">
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => router.back()}
            className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
          >
            Abbrechen
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="ml-3 inline-flex justify-center rounded-md border border-transparent bg-primary-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
          >
            {isSubmitting ? 'Wird gespeichert...' : product ? 'Speichern' : 'Erstellen'}
          </button>
        </div>
      </div>
    </form>
  )
} 