'use client';

import { StarIcon } from '@heroicons/react/24/solid';

interface ReviewSummaryProps {
  averageRating: number;
  totalReviews: number;
  ratingDistribution?: {
    [key: number]: number;
  };
}

export default function ReviewSummary({ 
  averageRating, 
  totalReviews,
  ratingDistribution = {}
}: ReviewSummaryProps) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center space-x-4">
        <div className="flex-shrink-0">
          <div className="flex items-center">
            <span className="text-3xl font-bold text-gray-900">
              {averageRating.toFixed(1)}
            </span>
            <span className="text-gray-500 ml-1">/ 5</span>
          </div>
          <div className="flex items-center mt-1">
            {[...Array(5)].map((_, index) => (
              <StarIcon
                key={index}
                className={`h-5 w-5 ${
                  index < Math.round(averageRating)
                    ? 'text-yellow-400'
                    : 'text-gray-200'
                }`}
              />
            ))}
          </div>
          <p className="text-sm text-gray-500 mt-1">
            {totalReviews} {totalReviews === 1 ? 'Bewertung' : 'Bewertungen'}
          </p>
        </div>

        {Object.keys(ratingDistribution).length > 0 && (
          <div className="flex-grow">
            {[5, 4, 3, 2, 1].map((rating) => {
              const count = ratingDistribution[rating] || 0;
              const percentage = totalReviews > 0 
                ? (count / totalReviews) * 100 
                : 0;
              
              return (
                <div key={rating} className="flex items-center text-sm">
                  <span className="w-12">{rating} Sterne</span>
                  <div className="flex-grow mx-4">
                    <div className="h-2 rounded-full bg-gray-200">
                      <div
                        className="h-2 rounded-full bg-yellow-400"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                  <span className="w-12 text-right text-gray-500">
                    {count}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
} 