export default function Loading() {
  return (
    <div className="grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3 xl:gap-x-8">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="animate-pulse">
          <div className="aspect-h-1 aspect-w-1 w-full overflow-hidden rounded-lg bg-gray-200" />
          <div className="mt-4 flex justify-between">
            <div>
              <div className="h-4 w-32 bg-gray-200 rounded" />
              <div className="mt-1 h-4 w-24 bg-gray-200 rounded" />
            </div>
            <div className="h-4 w-16 bg-gray-200 rounded" />
          </div>
        </div>
      ))}
    </div>
  )
} 