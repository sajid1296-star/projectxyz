import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import ReviewModeration from '@/components/admin/reviews/ReviewModeration'

export default async function AdminReviewsPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.role === 'ADMIN') redirect('/')

  const [pendingReviews, reportedReviews, stats] = await Promise.all([
    // Ausstehende Reviews
    prisma.review.findMany({
      where: { status: 'PENDING' },
      include: {
        user: true,
        product: true,
        _count: { select: { comments: true } }
      },
      orderBy: { createdAt: 'desc' }
    }),
    // Gemeldete Reviews
    prisma.review.findMany({
      where: { reported: true },
      include: {
        user: true,
        product: true,
        _count: { select: { comments: true } }
      },
      orderBy: { createdAt: 'desc' }
    }),
    // Review-Statistiken
    prisma.$queryRaw`
      SELECT 
        status,
        COUNT(*) as count,
        AVG(rating) as avgRating,
        COUNT(DISTINCT "userId") as uniqueUsers
      FROM "Review"
      GROUP BY status
    `
  ])

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <ReviewModeration
        pendingReviews={pendingReviews}
        reportedReviews={reportedReviews}
        stats={stats}
      />
    </div>
  )
} 