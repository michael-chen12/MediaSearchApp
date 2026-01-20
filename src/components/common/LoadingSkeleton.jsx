export function MovieCardSkeleton() {
  return (
    <div className="rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800 shadow-md animate-pulse">
      <div className="aspect-[2/3] bg-gray-300 dark:bg-gray-700 shimmer" />
      <div className="p-4 space-y-2">
        <div className="h-5 bg-gray-300 dark:bg-gray-700 rounded shimmer" />
        <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-1/2 shimmer" />
      </div>
    </div>
  );
}

export function MovieGridSkeleton({ count = 12 }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
      {Array.from({ length: count }).map((_, index) => (
        <MovieCardSkeleton key={index} />
      ))}
    </div>
  );
}

export function MovieDetailSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="relative h-[400px] bg-gray-300 dark:bg-gray-700 shimmer mb-8" />
      <div className="space-y-4">
        <div className="h-8 bg-gray-300 dark:bg-gray-700 rounded w-3/4 shimmer" />
        <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-1/4 shimmer" />
        <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded shimmer" />
        <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded shimmer" />
        <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-5/6 shimmer" />
      </div>
    </div>
  );
}
