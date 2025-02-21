import { notFound } from 'next/navigation';
import AddToCartButton from '@/components/products/AddToCartButton';
import ProductGallery from '@/components/products/ProductGallery';
import ProductSpecs from '@/components/products/ProductSpecs';
import prisma from '@/lib/prisma';
import { formatCurrency } from '@/lib/utils';

export default async function ProductPage({
  params,
}: {
  params: { slug: string };
}) {
  const product = await prisma.product.findUnique({
    where: { slug: params.slug },
    include: {
      category: true,
      specs: true,
    },
  });

  if (!product) {
    notFound();
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="pt-6 pb-16 sm:pb-24">
        <nav aria-label="Breadcrumb">
          <ol className="max-w-2xl mx-auto px-4 flex items-center space-x-2 sm:px-6 lg:max-w-7xl lg:px-8">
            <li>
              <div className="flex items-center">
                <a href="/products" className="mr-2 text-sm font-medium text-gray-900">
                  Produkte
                </a>
                <svg
                  width={16}
                  height={20}
                  viewBox="0 0 16 20"
                  fill="currentColor"
                  className="h-5 w-4 text-gray-300"
                >
                  <path d="M5.697 4.34L8.98 16.532h1.327L7.025 4.341H5.697z" />
                </svg>
              </div>
            </li>
            <li className="text-sm">
              <a
                href={`/products?category=${product.category.id}`}
                className="font-medium text-gray-500 hover:text-gray-600"
              >
                {product.category.name}
              </a>
            </li>
          </ol>
        </nav>

        <div className="mt-8 max-w-2xl mx-auto px-4 sm:px-6 lg:max-w-7xl lg:px-8">
          <div className="lg:grid lg:grid-cols-2 lg:gap-x-8 lg:items-start">
            {/* Produktbilder */}
            <ProductGallery images={product.images} />

            {/* Produktinfo */}
            <div className="mt-10 px-4 sm:px-0 sm:mt-16 lg:mt-0">
              <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">
                {product.name}
              </h1>

              <div className="mt-3">
                <h2 className="sr-only">Produktinformationen</h2>
                <p className="text-3xl text-gray-900">{formatCurrency(product.price)}</p>
              </div>

              <div className="mt-6">
                <h3 className="sr-only">Beschreibung</h3>
                <div className="text-base text-gray-700 space-y-6">
                  {product.description}
                </div>
              </div>

              <div className="mt-6">
                <div className="flex items-center">
                  <div className={`h-4 w-4 rounded-full flex items-center justify-center ${
                    product.available ? 'bg-green-100' : 'bg-red-100'
                  }`}>
                    <div className={`h-2 w-2 rounded-full ${
                      product.available ? 'bg-green-600' : 'bg-red-600'
                    }`} />
                  </div>
                  <p className="ml-2 text-sm text-gray-500">
                    {product.available ? 'Auf Lager' : 'Nicht verfügbar'}
                  </p>
                </div>
              </div>

              <div className="mt-6">
                <AddToCartButton productId={product.id} />
              </div>

              {/* Produktspezifikationen */}
              <ProductSpecs specs={product.specs} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 