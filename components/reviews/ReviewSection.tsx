'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { Review, Comment, ReviewStatus } from '@prisma/client'
import ReviewForm from './ReviewForm'
import ReviewList from './ReviewList'
import ReviewStats from './ReviewStats'
import CommentSection from './CommentSection'

interface ReviewSectionProps {
  productId: string
  initialReviews: any[]
  canReview: boolean
}

export default function ReviewSection({
  productId,
  initialReviews,
  canReview
}: ReviewSectionProps) {
  const { data: session } = useSession()
  const [reviews, setReviews] = useState(initialReviews)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [selectedReview, setSelectedReview] = useState<Review | null>(null)

  const handleSubmitReview = async (data: any) => {
    try {
      const response = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, productId })
      })

      if (!response.ok) throw new Error('Fehler beim Speichern')

      const newReview = await response.json()
      setReviews([newReview, ...reviews])
      setIsFormOpen(false)
    } catch (error) {
      console.error('Error:', error)
      alert('Ein Fehler ist aufgetreten')
    }
  }

  const handleHelpful = async (reviewId: string) => {
    try {
      await fetch(`/api/reviews/${reviewId}/helpful`, {
        method: 'POST'
      })
      
      setReviews(reviews.map(review =>
        review.id === reviewId
          ? { ...review, helpful: review.helpful + 1 }
          : review
      ))
    } catch (error) {
      console.error('Error:', error)
    }
  }

  const handleReport = async (reviewId: string) => {
    if (!confirm('Möchten Sie diese Bewertung wirklich melden?')) return

    try {
      await fetch(`/api/reviews/${reviewId}/report`, {
        method: 'POST'
      })
      
      alert('Bewertung wurde gemeldet')
    } catch (error) {
      console.error('Error:', error)
      alert('Ein Fehler ist aufgetreten')
    }
  }

  return (
    <div className="mt-16 lg:mt-20">
      <ReviewStats reviews={reviews} />

      {canReview && session && (
        <button
          onClick={() => setIsFormOpen(true)}
          className="mt-6 inline-flex items-center rounded-md bg-primary-600 px-3 py-2 text-sm font-semibold text-white hover:bg-primary-500"
        >
          Bewertung schreiben
        </button>
      )}

      {isFormOpen && (
        <ReviewForm
          onSubmit={handleSubmitReview}
          onCancel={() => setIsFormOpen(false)}
        />
      )}

      <ReviewList
        reviews={reviews}
        onHelpful={handleHelpful}
        onReport={handleReport}
        onSelectReview={setSelectedReview}
      />

      {selectedReview && (
        <CommentSection
          review={selectedReview}
          onClose={() => setSelectedReview(null)}
        />
      )}
    </div>
  )
} 