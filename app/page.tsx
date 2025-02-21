import Image from 'next/image'
import Link from 'next/link'
import prisma from '@/lib/prisma'

export default async function Home() {
  const featuredProducts = await prisma.product.findMany({
    where: { featured: true },
    include: { images: true },
    take: 4,
  })

  return (
    <div className="bg-white">
      {/* Hero Section */}
      <div className="relative">
        <div className="mx-auto max-w-7xl px-6 py-24 sm:py-32 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl">
              TechTrade - Ihr Partner für gebrauchte Technik
            </h1>
            <p className="mt-6 text-lg leading-8 text-gray-600">
              Kaufen und verkaufen Sie hochwertige gebrauchte Elektronik zu fairen Preisen.
            </p>
            <div className="mt-10 flex items-center justify-center gap-x-6">
              <Link
                href="/products"
                className="rounded-md bg-primary-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-primary-500"
              >
                Produkte entdecken
              </Link>
              <Link
                href="/trade-in"
                className="text-sm font-semibold leading-6 text-gray-900"
              >
                Trade-In starten <span aria-hidden="true">→</span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Featured Products */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <h2 className="text-2xl font-bold tracking-tight text-gray-900">
          Ausgewählte Produkte
        </h2>
        <div className="mt-6 grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-4 xl:gap-x-8">
          {featuredProducts.map((product) => (
            <div key={product.id} className="group relative">
              <div className="aspect-h-1 aspect-w-1 w-full overflow-hidden rounded-md bg-gray-200 lg:aspect-none lg:h-80">
                <Image
                  src={product.images[0]?.url || '/images/placeholder.jpg'}
                  alt={product.name}
                  width={500}
                  height={500}
                  className="h-full w-full object-cover object-center lg:h-full lg:w-full"
                />
              </div>
              <div className="mt-4 flex justify-between">
                <div>
                  <h3 className="text-sm text-gray-700">
                    <Link href={`/products/${product.id}`}>
                      <span aria-hidden="true" className="absolute inset-0" />
                      {product.name}
                    </Link>
                  </h3>
                </div>
                <p className="text-sm font-medium text-gray-900">
                  {product.price.toFixed(2)} €
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
} 