import { getServerSession } from 'next-auth'
import { redirect, notFound } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import ProductForm from '@/components/admin/ProductForm'

interface EditProductPageProps {
  params: {
    id: string
  }
}

export default async function EditProductPage({ params }: EditProductPageProps) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.role === 'ADMIN') {
    redirect('/')
  }

  const [product, categories, brands] = await Promise.all([
    prisma.product.findUnique({
      where: { id: params.id },
      include: {
        images: true,
      },
    }),
    prisma.category.findMany(),
    prisma.brand.findMany(),
  ])

  if (!product) {
    notFound()
  }

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <div className="py-8">
        <ProductForm 
          product={product} 
          categories={categories} 
          brands={brands} 
        />
      </div>
    </div>
  )
} 