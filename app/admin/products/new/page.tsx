import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import ProductForm from '@/components/admin/ProductForm'

export default async function NewProductPage() {
  const session = await getServerSession(authOptions)

  if (!session?.user?.role === 'ADMIN') {
    redirect('/')
  }

  const [categories, brands] = await Promise.all([
    prisma.category.findMany(),
    prisma.brand.findMany(),
  ])

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <div className="py-8">
        <ProductForm 
          categories={categories} 
          brands={brands} 
        />
      </div>
    </div>
  )
} 