import { useQuery } from '@tanstack/react-query';
import { useSearchParams, Link } from 'react-router-dom';
import { searchMovies, searchTVShows } from '../lib/tmdbClient';
import MovieCard from '../components/common/MovieCard';
import TVShowCard from '../components/common/TVShowCard';
import { MovieGridSkeleton } from '../components/common/LoadingSkeleton';
import ErrorMessage from '../components/common/ErrorMessage';
import EmptyState from '../components/common/EmptyState';
import Pagination from '../components/common/Pagination';
import TabNavigation from '../components/common/navigation/TabNavigation';

export default function SearchResults() {
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const mediaType = searchParams.get('mediaType') || 'movie';
  const page = parseInt(searchParams.get('page') || '1', 10);

  const mediaTypeTabs = [
    { id: 'movie', label: 'Movies' },
    { id: 'tv', label: 'TV Shows' }
  ];

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: mediaType === 'movie' ? ['searchMovies', query, page] : ['searchTVShows', query, page],
    queryFn: () => mediaType === 'movie' ? searchMovies(query, page) : searchTVShows(query, page),
    enabled: query.length > 0,
  });

  const handleMediaTypeChange = (newMediaType) => {
    setSearchParams({ q: query, mediaType: newMediaType, page: '1' });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePageChange = (newPage) => {
    setSearchParams({ q: query, mediaType, page: newPage.toString() });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (!query) {
    return (
      <EmptyState
        title="Start searching"
        message="Enter a movie or TV show title in the search bar above."
        showHomeLink
      />
    );
  }

  if (isLoading) {
    return (
      <div>
        <div className="mb-8">
          <Link
            to="/"
            className="inline-flex items-center text-primary-600 dark:text-primary-400 hover:underline mb-4"
          >
            <svg
              className="w-5 h-5 mr-1"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Back to Home
          </Link>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-gray-100 mb-6">
            Searching for "{query}"
          </h1>
          <TabNavigation tabs={mediaTypeTabs} activeTab={mediaType} onTabChange={handleMediaTypeChange} />
        </div>
        <MovieGridSkeleton count={18} />
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <Link
          to="/"
          className="inline-flex items-center text-primary-600 dark:text-primary-400 hover:underline mb-4"
        >
          <svg
            className="w-5 h-5 mr-1"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          Back to Home
        </Link>
        <ErrorMessage message={error.message} onRetry={refetch} />
      </div>
    );
  }

  const items = data?.results || [];
  const totalPages = data?.total_pages || 0;

  if (items.length === 0) {
    return (
      <div>
        <Link
          to="/"
          className="inline-flex items-center text-primary-600 dark:text-primary-400 hover:underline mb-4"
        >
          <svg
            className="w-5 h-5 mr-1"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          Back to Home
        </Link>
        <EmptyState
          title={`No ${mediaType === 'movie' ? 'movies' : 'TV shows'} found for "${query}"`}
          message="Try different keywords or check your spelling."
        />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <Link
          to="/"
          className="inline-flex items-center text-primary-600 dark:text-primary-400 hover:underline mb-4"
        >
          <svg
            className="w-5 h-5 mr-1"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          Back to Home
        </Link>
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          Search Results for "{query}"
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Found {data.total_results.toLocaleString()} {mediaType === 'movie' ? 'movies' : 'TV shows'}
        </p>
      </div>

      <div className="mb-8">
        <TabNavigation tabs={mediaTypeTabs} activeTab={mediaType} onTabChange={handleMediaTypeChange} />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
        {items.map((item) => (
          mediaType === 'movie' ? (
            <MovieCard key={item.id} movie={item} />
          ) : (
            <TVShowCard key={item.id} tvShow={item} />
          )
        ))}
      </div>

      {totalPages > 1 && (
        <Pagination
          currentPage={page}
          totalPages={totalPages}
          onPageChange={handlePageChange}
        />
      )}
    </div>
  );
}
