import { Suspense } from 'react';
import ProductGrid from '@/components/products/ProductGrid';
import ProductFilters from '@/components/products/ProductFilters';
import ProductSearch from '@/components/products/ProductSearch';
import ProductSort from '@/components/products/ProductSort';
import Loading from './loading';
import prisma from '@/lib/prisma';

interface ProductsPageProps {
  searchParams: {
    category?: string;
    brand?: string;
    minPrice?: string;
    maxPrice?: string;
    sort?: string;
    search?: string;
  };
}

export default async function ProductsPage({ searchParams }: ProductsPageProps) {
  // Hole alle Kategorien und Marken für die Filter
  const [categories, brands] = await Promise.all([
    prisma.category.findMany({
      orderBy: { name: 'asc' },
    }),
    prisma.brand.findMany({
      orderBy: { name: 'asc' },
    }),
  ]);

  // Erstelle die Filterbedingungen
  const where = {
    AND: [
      searchParams.category ? { categoryId: searchParams.category } : {},
      searchParams.brand ? { brandId: searchParams.brand } : {},
      searchParams.minPrice ? { price: { gte: parseFloat(searchParams.minPrice) } } : {},
      searchParams.maxPrice ? { price: { lte: parseFloat(searchParams.maxPrice) } } : {},
      searchParams.search ? {
        OR: [
          { name: { contains: searchParams.search, mode: 'insensitive' } },
          { description: { contains: searchParams.search, mode: 'insensitive' } },
        ],
      } : {},
    ],
  };

  // Bestimme die Sortierung
  const orderBy = (() => {
    switch (searchParams.sort) {
      case 'price-asc':
        return { price: 'asc' };
      case 'price-desc':
        return { price: 'desc' };
      case 'name-asc':
        return { name: 'asc' };
      case 'name-desc':
        return { name: 'desc' };
      default:
        return { createdAt: 'desc' };
    }
  })();

  // Hole die gefilterten Produkte
  const products = await prisma.product.findMany({
    where,
    orderBy,
    include: {
      category: true,
      brand: true,
      images: true,
    },
  });

  return (
    <div className="bg-white">
      <div>
        <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-baseline justify-between border-b border-gray-200 pb-6 pt-24">
            <h1 className="text-4xl font-bold tracking-tight text-gray-900">
              Produkte
            </h1>
          </div>

          <section aria-labelledby="products-heading" className="pb-24 pt-6">
            <h2 id="products-heading" className="sr-only">
              Produkte
            </h2>

            <div className="grid grid-cols-1 gap-x-8 gap-y-10 lg:grid-cols-4">
              {/* Filter */}
              <div className="hidden lg:block">
                <ProductFilters
                  categories={categories}
                  brands={brands}
                  selectedCategory={searchParams.category}
                  selectedBrand={searchParams.brand}
                  minPrice={searchParams.minPrice}
                  maxPrice={searchParams.maxPrice}
                />
              </div>

              {/* Produktgrid */}
              <div className="lg:col-span-3">
                <div className="mb-6">
                  <div className="flex items-center justify-between">
                    <ProductSearch initialQuery={searchParams.search} />
                    <ProductSort initialSort={searchParams.sort} />
                  </div>
                </div>

                <Suspense fallback={<Loading />}>
                  <ProductGrid products={products} />
                </Suspense>
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
} 