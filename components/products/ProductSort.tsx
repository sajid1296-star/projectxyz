'use client'

import { useRouter, useSearchParams } from 'next/navigation'

interface ProductSortProps {
  initialSort?: string
}

const sortOptions = [
  { value: 'newest', label: 'Neueste zuerst' },
  { value: 'price-asc', label: 'Preis: Niedrig zu Hoch' },
  { value: 'price-desc', label: 'Preis: Hoch zu Niedrig' },
  { value: 'name-asc', label: 'Name: A-Z' },
  { value: 'name-desc', label: 'Name: Z-A' },
]

export default function ProductSort({ initialSort = 'newest' }: ProductSortProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const handleSort = (value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    
    if (value === 'newest') {
      params.delete('sort')
    } else {
      params.set('sort', value)
    }

    router.push(`/products?${params.toString()}`)
  }

  return (
    <select
      value={initialSort}
      onChange={(e) => handleSort(e.target.value)}
      className="block w-full rounded-md border-0 py-1.5 pl-3 pr-10 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-primary-600 sm:text-sm sm:leading-6"
    >
      {sortOptions.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  )
} 