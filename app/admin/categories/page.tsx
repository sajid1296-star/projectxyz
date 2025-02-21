import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import CategoryManager from '@/components/admin/categories/CategoryManager'
import BrandManager from '@/components/admin/categories/BrandManager'

export default async function CategoriesPage() {
  const session = await getServerSession(authOptions)

  if (!session?.user?.role === 'ADMIN') {
    redirect('/')
  }

  const [categories, brands, productCounts] = await Promise.all([
    // Kategorien mit Hierarchie
    prisma.category.findMany({
      include: {
        parent: true,
        children: true,
        _count: {
          select: { products: true }
        },
        metadata: true
      }
    }),
    // Marken mit Statistiken
    prisma.brand.findMany({
      include: {
        _count: {
          select: { products: true }
        },
        metadata: true
      }
    }),
    // Produktzählung pro Kategorie und Marke
    prisma.$queryRaw`
      SELECT 
        c."id" as "categoryId",
        b."id" as "brandId",
        COUNT(p."id") as count
      FROM "Product" p
      LEFT JOIN "Category" c ON p."categoryId" = c."id"
      LEFT JOIN "Brand" b ON p."brandId" = b."id"
      GROUP BY c."id", b."id"
    `
  ])

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <div className="grid grid-cols-1 gap-x-8 gap-y-10 lg:grid-cols-2">
        <CategoryManager 
          categories={categories} 
          productCounts={productCounts} 
        />
        <BrandManager 
          brands={brands} 
          productCounts={productCounts} 
        />
      </div>
    </div>
  )
} 