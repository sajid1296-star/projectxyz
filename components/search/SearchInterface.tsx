'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Disclosure } from '@headlessui/react'
import { ChevronDownIcon } from '@heroicons/react/24/outline'
import debounce from 'lodash/debounce'
import RangeSlider from './RangeSlider'

interface SearchInterfaceProps {
  initialResults?: any
}

export default function SearchInterface({ initialResults }: SearchInterfaceProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  const [query, setQuery] = useState(searchParams.get('q') || '')
  const [filters, setFilters] = useState<Record<string, any>>(
    searchParams.get('filters') 
      ? JSON.parse(searchParams.get('filters')!)
      : {}
  )
  const [sort, setSort] = useState(searchParams.get('sort') || '')
  const [results, setResults] = useState(initialResults)
  const [loading, setLoading] = useState(false)

  // Debounced Suche
  const debouncedSearch = debounce(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        q: query,
        filters: JSON.stringify(filters),
        sort
      })

      const response = await fetch(`/api/search?${params}`)
      const data = await response.json()
      setResults(data)

      // Update URL
      router.push(`/search?${params}`, { scroll: false })
    } catch (error) {
      console.error('Search error:', error)
    } finally {
      setLoading(false)
    }
  }, 300)

  useEffect(() => {
    debouncedSearch()
    return () => debouncedSearch.cancel()
  }, [query, filters, sort])

  const handleFilterChange = (key: string, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }))
  }

  return (
    <div className="grid grid-cols-4 gap-x-8">
      {/* Filter-Sidebar */}
      <div className="col-span-1">
        <div className="space-y-6">
          {/* Preisfilter */}
          <Disclosure defaultOpen>
            {({ open }) => (
              <>
                <Disclosure.Button className="flex w-full justify-between text-left">
                  <span className="text-sm font-medium text-gray-900">Preis</span>
                  <ChevronDownIcon
                    className={`${open ? 'rotate-180 transform' : ''} h-5 w-5`}
                  />
                </Disclosure.Button>
                <Disclosure.Panel className="pt-4">
                  <RangeSlider
                    min={0}
                    max={1000}
                    value={filters.price || [0, 1000]}
                    onChange={value => handleFilterChange('price', value)}
                  />
                </Disclosure.Panel>
              </>
            )}
          </Disclosure>

          {/* Kategorien */}
          <Disclosure defaultOpen>
            {({ open }) => (
              <>
                <Disclosure.Button className="flex w-full justify-between text-left">
                  <span className="text-sm font-medium text-gray-900">
                    Kategorien
                  </span>
                  <ChevronDownIcon
                    className={`${open ? 'rotate-180 transform' : ''} h-5 w-5`}
                  />
                </Disclosure.Button>
                <Disclosure.Panel className="pt-4">
                  <div className="space-y-2">
                    {results?.facets?.categories.map((category: any) => (
                      <label
                        key={category.value}
                        className="flex items-center"
                      >
                        <input
                          type="checkbox"
                          checked={filters.categories?.includes(category.value)}
                          onChange={e => {
                            const categories = filters.categories || []
                            handleFilterChange('categories',
                              e.target.checked
                                ? [...categories, category.value]
                                : categories.filter((c: string) => c !== category.value)
                            )
                          }}
                          className="h-4 w-4 rounded border-gray-300"
                        />
                        <span className="ml-2 text-sm text-gray-600">
                          {category.value} ({category.count})
                        </span>
                      </label>
                    ))}
                  </div>
                </Disclosure.Panel>
              </>
            )}
          </Disclosure>

          {/* Weitere Filter... */}
        </div>
      </div>

      {/* Suchergebnisse */}
      <div className="col-span-3">
        <div className="mb-6 flex items-center justify-between">
          <div className="relative">
            <input
              type="search"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Suchen..."
              className="w-full rounded-md border border-gray-300 pl-10 pr-4 py-2"
            />
            {/* Suchicon */}
          </div>

          <select
            value={sort}
            onChange={e => setSort(e.target.value)}
            className="rounded-md border border-gray-300 py-2 pl-3 pr-10"
          >
            <option value="">Relevanz</option>
            <option value="price:asc">Preis aufsteigend</option>
            <option value="price:desc">Preis absteigend</option>
            <option value="rating:desc">Beste Bewertung</option>
          </select>
        </div>

        {loading ? (
          <div>Lädt...</div>
        ) : (
          <div className="grid grid-cols-3 gap-6">
            {results?.products.map((product: any) => (
              <div key={product.id} className="rounded-lg border p-4">
                {/* Produktkarte */}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
} 