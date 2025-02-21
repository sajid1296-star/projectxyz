interface TopProduct {
  id: string
  name: string
  orderCount: number
  revenue: number
}

interface TopProductsProps {
  products: TopProduct[]
}

export default function TopProducts({ products }: TopProductsProps) {
  return (
    <div className="overflow-hidden rounded-lg bg-white shadow">
      <div className="p-6">
        <h2 className="text-base font-medium text-gray-900">
          Top Produkte
        </h2>
        <div className="mt-6 flow-root">
          <ul role="list" className="-my-5 divide-y divide-gray-200">
            {products.map((product) => (
              <li key={product.id} className="py-5">
                <div className="relative focus-within:ring-2 focus-within:ring-primary-500">
                  <h3 className="text-sm font-semibold text-gray-800">
                    {product.name}
                  </h3>
                  <p className="mt-1 text-sm text-gray-600">
                    {product.orderCount} Bestellungen
                  </p>
                  <p className="mt-1 text-sm text-gray-500">
                    Umsatz: {product.revenue.toFixed(2)} €
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
} 