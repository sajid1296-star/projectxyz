import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import AdminProductList from '@/components/admin/products/AdminProductList'
import { uploadImage, deleteImage } from '@/lib/storage'

export default async function AdminProductsPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.role === 'ADMIN') redirect('/')

  const [products, categories, brands] = await Promise.all([
    prisma.product.findMany({
      include: {
        category: true,
        brand: true,
        images: true,
        variants: true,
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.category.findMany(),
    prisma.brand.findMany(),
  ])

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <AdminProductList 
        initialProducts={products}
        categories={categories}
        brands={brands}
        onImageUpload={uploadImage}
        onImageDelete={deleteImage}
      />
    </div>
  )
} 