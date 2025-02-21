import { notFound } from 'next/navigation'
import prisma from '@/lib/prisma'
import ProductDetails from '@/components/products/ProductDetails'
import RelatedProducts from '@/components/products/RelatedProducts'

interface ProductPageProps {
  params: {
    id: string
  }
}

export default async function ProductPage({ params }: ProductPageProps) {
  const product = await prisma.product.findUnique({
    where: { id: params.id },
    include: {
      category: true,
      brand: true,
      images: true,
      variants: true,
    },
  })

  if (!product) {
    notFound()
  }

  // Hole ähnliche Produkte aus der gleichen Kategorie
  const relatedProducts = await prisma.product.findMany({
    where: {
      categoryId: product.categoryId,
      NOT: {
        id: product.id,
      },
    },
    include: {
      images: true,
      brand: true,
    },
    take: 4,
  })

  return (
    <div className="bg-white">
      <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6 sm:py-24 lg:max-w-7xl lg:px-8">
        <ProductDetails product={product} />
        
        {relatedProducts.length > 0 && (
          <div className="mt-16">
            <RelatedProducts products={relatedProducts} />
          </div>
        )}
      </div>
    </div>
  )
} 