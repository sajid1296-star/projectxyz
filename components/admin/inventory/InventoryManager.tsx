'use client'

import { useState, useEffect } from 'react'
import { 
  InventoryItem, 
  Product, 
  Warehouse,
  StockMovement 
} from '@prisma/client'
import { 
  ArrowUpIcon, 
  ArrowDownIcon,
  ExclamationCircleIcon 
} from '@heroicons/react/24/outline'

interface ExtendedInventoryItem extends InventoryItem {
  product: Product
  warehouse: Warehouse
  movements: StockMovement[]
}

export default function InventoryManager() {
  const [items, setItems] = useState<ExtendedInventoryItem[]>([])
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>('')
  const [showLowStock, setShowLowStock] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchInventory()
  }, [selectedWarehouse, showLowStock])

  async function fetchInventory() {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (selectedWarehouse) params.set('warehouseId', selectedWarehouse)
      if (showLowStock) params.set('lowStock', 'true')

      const response = await fetch(`/api/inventory?${params}`)
      const data = await response.json()
      setItems(data)
    } catch (error) {
      console.error('Error fetching inventory:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleStockAdjustment(
    itemId: string,
    quantity: number,
    type: 'ADJUSTMENT' | 'LOSS'
  ) {
    try {
      await fetch('/api/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemId,
          quantity,
          type,
          reference: `Manual ${type.toLowerCase()}`
        })
      })
      
      fetchInventory()
    } catch (error) {
      console.error('Error adjusting stock:', error)
    }
  }

  return (
    <div className="space-y-6">
      <div className="sm:flex sm:items-center sm:justify-between">
        <div className="sm:flex-auto">
          <h1 className="text-xl font-semibold text-gray-900">
            Lagerverwaltung
          </h1>
        </div>
        <div className="mt-4 sm:mt-0 sm:flex-none space-x-4">
          <select
            value={selectedWarehouse}
            onChange={(e) => setSelectedWarehouse(e.target.value)}
            className="rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
          >
            <option value="">Alle Lager</option>
            {/* Warehouse options */}
          </select>
          
          <label className="inline-flex items-center">
            <input
              type="checkbox"
              checked={showLowStock}
              onChange={(e) => setShowLowStock(e.target.checked)}
              className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            <span className="ml-2 text-sm text-gray-600">
              Nur niedriger Bestand
            </span>
          </label>
        </div>
      </div>

      <div className="mt-8 flow-root">
        <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
            <table className="min-w-full divide-y divide-gray-300">
              <thead>
                <tr>
                  <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900">
                    Produkt
                  </th>
                  <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                    Lager
                  </th>
                  <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                    Bestand
                  </th>
                  <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                    Min/Max
                  </th>
                  <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                    Lagerort
                  </th>
                  <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-0">
                    <span className="sr-only">Aktionen</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {items.map((item) => (
                  <tr key={item.id}>
                    <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm">
                      <div className="font-medium text-gray-900">
                        {item.product.name}
                      </div>
                      <div className="text-gray-500">
                        {item.product.sku}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                      {item.warehouse.name}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm">
                      <span className={
                        item.quantity <= item.minQuantity
                          ? 'text-red-600 font-medium'
                          : 'text-gray-900'
                      }>
                        {item.quantity}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                      {item.minQuantity} / {item.maxQuantity || '∞'}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                      {item.location || '-'}
                    </td>
                    <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-0">
                      <button
                        onClick={() => handleStockAdjustment(item.id, 1, 'ADJUSTMENT')}
                        className="text-primary-600 hover:text-primary-900"
                      >
                        <ArrowUpIcon className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => handleStockAdjustment(item.id, -1, 'ADJUSTMENT')}
                        className="ml-4 text-primary-600 hover:text-primary-900"
                      >
                        <ArrowDownIcon className="h-5 w-5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
} 