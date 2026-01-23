import { useQuery } from '@tanstack/react-query';
import { useParams, Link } from 'react-router-dom';
import { getCollectionDetails, getImageUrl } from '../lib/tmdbClient';
import { MovieDetailSkeleton, MovieGridSkeleton } from '../components/common/LoadingSkeleton';
import ErrorMessage from '../components/common/ErrorMessage';
import MovieCard from '../components/common/MovieCard';

export default function CollectionDetail() {
  const { id } = useParams();

  const { data: collection, isLoading, error, refetch } = useQuery({
    queryKey: ['collectionDetails', id],
    queryFn: () => getCollectionDetails(id),
  });

  if (isLoading) {
    return (
      <div className="px-4 sm:px-0">
        <Link
          to="/"
          className="inline-flex items-center text-sm sm:text-base text-primary-600 dark:text-primary-400 hover:underline mb-3 sm:mb-4"
        >
          <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Home
        </Link>
        <MovieDetailSkeleton />
      </div>
    );
  }

  if (error) {
    return (
      <div className="px-4 sm:px-0">
        <Link
          to="/"
          className="inline-flex items-center text-sm sm:text-base text-primary-600 dark:text-primary-400 hover:underline mb-3 sm:mb-4"
        >
          <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Home
        </Link>
        <ErrorMessage message={error.message} onRetry={refetch} />
      </div>
    );
  }

  const backdropUrl = getImageUrl(collection.backdrop_path, 'backdrop', 'large');
  const posterUrl = getImageUrl(collection.poster_path, 'poster', 'large');
  
  // Sort movies by release date (chronological order)
  const sortedMovies = [...(collection.parts || [])].sort((a, b) => {
    const dateA = new Date(a.release_date || '1900-01-01');
    const dateB = new Date(b.release_date || '1900-01-01');
    return dateA - dateB;
  });

  return (
    <div className="px-4 sm:px-0">
      <Link
        to="/"
        className="inline-flex items-center text-sm sm:text-base text-primary-600 dark:text-primary-400 hover:underline mb-4 sm:mb-6"
      >
        <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to Home
      </Link>

      {/* Backdrop Image */}
      {backdropUrl && (
        <div className="relative h-[200px] sm:h-[300px] md:h-[400px] rounded-lg sm:rounded-xl overflow-hidden mb-6 sm:mb-8 bg-gray-200 dark:bg-gray-800">
          <img
            src={backdropUrl}
            alt={`${collection.name} backdrop`}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-white dark:from-gray-900 via-transparent to-transparent" />
        </div>
      )}

      {/* Collection Header */}
      <div className="grid md:grid-cols-[280px,1fr] lg:grid-cols-[300px,1fr] gap-6 sm:gap-8 mb-8 sm:mb-12">
        {posterUrl && (
          <div className="hidden md:block">
            <img
              src={posterUrl}
              alt={`${collection.name} poster`}
              className="w-full rounded-lg shadow-xl"
            />
          </div>
        )}

        <div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 dark:text-gray-100 mb-4 sm:mb-6">
            {collection.name}
          </h1>

          {collection.overview && (
            <div className="mb-6 sm:mb-8">
              <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-2 sm:mb-3">
                Overview
              </h2>
              <p className="text-sm sm:text-base text-gray-700 dark:text-gray-300 leading-relaxed">
                {collection.overview}
              </p>
            </div>
          )}

          <div className="text-gray-700 dark:text-gray-300">
            <span className="font-semibold">Total Movies:</span> {sortedMovies.length}
          </div>
        </div>
      </div>

      {/* Movies in Collection */}
      {sortedMovies.length > 0 && (
        <div className="mb-8 sm:mb-12">
          <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-4 sm:mb-6">
            Movies in Collection
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-5 md:gap-6">
            {sortedMovies.map((movie) => (
              <MovieCard key={movie.id} movie={movie} />
            ))}
          </div>
        </div>
      )}

      {sortedMovies.length === 0 && (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          No movies found in this collection.
        </div>
      )}
    </div>
  );
}
