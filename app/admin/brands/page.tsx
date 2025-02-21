import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import BrandList from '@/components/admin/BrandList'

export default async function BrandsPage() {
  const session = await getServerSession(authOptions)

  if (!session?.user?.role === 'ADMIN') {
    redirect('/')
  }

  const brands = await prisma.brand.findMany({
    include: {
      _count: {
        select: { products: true }
      }
    },
    orderBy: {
      name: 'asc'
    }
  })

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-base font-semibold leading-6 text-gray-900">
            Marken
          </h1>
          <p className="mt-2 text-sm text-gray-700">
            Verwalten Sie die Produktmarken Ihres Shops.
          </p>
        </div>
      </div>
      <div className="mt-8">
        <BrandList brands={brands} />
      </div>
    </div>
  )
} 