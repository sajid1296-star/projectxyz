'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/20/solid'
import clsx from 'clsx'

interface PaginationProps {
  totalItems: number
  itemsPerPage: number
  currentPage: number
  baseUrl: string
}

export default function Pagination({
  totalItems,
  itemsPerPage,
  currentPage,
  baseUrl,
}: PaginationProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const totalPages = Math.ceil(totalItems / itemsPerPage)

  if (totalPages <= 1) return null

  const handlePageChange = (page: number) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('page', page.toString())
    router.push(`${baseUrl}?${params.toString()}`)
  }

  return (
    <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6">
      <div className="flex flex-1 justify-between sm:hidden">
        <button
          onClick={() => handlePageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className={clsx(
            'relative inline-flex items-center rounded-md px-4 py-2 text-sm font-medium',
            currentPage === 1
              ? 'text-gray-300'
              : 'text-gray-700 hover:bg-gray-50'
          )}
        >
          Zurück
        </button>
        <button
          onClick={() => handlePageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className={clsx(
            'relative ml-3 inline-flex items-center rounded-md px-4 py-2 text-sm font-medium',
            currentPage === totalPages
              ? 'text-gray-300'
              : 'text-gray-700 hover:bg-gray-50'
          )}
        >
          Weiter
        </button>
      </div>
      <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-gray-700">
            Zeige{' '}
            <span className="font-medium">
              {(currentPage - 1) * itemsPerPage + 1}
            </span>{' '}
            bis{' '}
            <span className="font-medium">
              {Math.min(currentPage * itemsPerPage, totalItems)}
            </span>{' '}
            von <span className="font-medium">{totalItems}</span> Ergebnissen
          </p>
        </div>
        <div>
          <nav
            className="isolate inline-flex -space-x-px rounded-md shadow-sm"
            aria-label="Pagination"
          >
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className={clsx(
                'relative inline-flex items-center rounded-l-md px-2 py-2',
                currentPage === 1
                  ? 'text-gray-300'
                  : 'text-gray-400 hover:bg-gray-50'
              )}
            >
              <ChevronLeftIcon className="h-5 w-5" aria-hidden="true" />
            </button>
            {[...Array(totalPages)].map((_, i) => (
              <button
                key={i + 1}
                onClick={() => handlePageChange(i + 1)}
                className={clsx(
                  'relative inline-flex items-center px-4 py-2 text-sm font-semibold',
                  currentPage === i + 1
                    ? 'z-10 bg-primary-600 text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600'
                    : 'text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50'
                )}
              >
                {i + 1}
              </button>
            ))}
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className={clsx(
                'relative inline-flex items-center rounded-r-md px-2 py-2',
                currentPage === totalPages
                  ? 'text-gray-300'
                  : 'text-gray-400 hover:bg-gray-50'
              )}
            >
              <ChevronRightIcon className="h-5 w-5" aria-hidden="true" />
            </button>
          </nav>
        </div>
      </div>
    </div>
  )
} 