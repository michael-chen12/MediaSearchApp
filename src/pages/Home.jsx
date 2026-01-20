import { useQuery } from '@tanstack/react-query';
import { getTrendingMovies } from '../api/tmdb';
import MovieCard from '../components/common/MovieCard';
import { MovieGridSkeleton } from '../components/common/LoadingSkeleton';
import ErrorMessage from '../components/common/ErrorMessage';
import EmptyState from '../components/common/EmptyState';

export default function Home() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['trendingMovies'],
    queryFn: () => getTrendingMovies('week', 1),
  });

  if (isLoading) {
    return (
      <div>
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-gray-100 mb-8">
          Trending This Week
        </h1>
        <MovieGridSkeleton count={18} />
      </div>
    );
  }

  if (error) {
    return <ErrorMessage message={error.message} onRetry={refetch} />;
  }

  const movies = data?.results || [];

  if (movies.length === 0) {
    return (
      <EmptyState
        title="No trending movies"
        message="Check back later for trending movies."
      />
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          Trending This Week
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Discover the most popular movies right now
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
        {movies.map((movie) => (
          <MovieCard key={movie.id} movie={movie} />
        ))}
      </div>
    </div>
  );
}
