import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { getTrendingMovies, getTrendingTVShows } from '../lib/tmdbClient';
import MovieCard from '../components/common/MovieCard';
import TVShowCard from '../components/common/TVShowCard';
import { MovieGridSkeleton } from '../components/common/LoadingSkeleton';
import ErrorMessage from '../components/common/ErrorMessage';
import EmptyState from '../components/common/EmptyState';
import TabNavigation from '../components/common/navigation/TabNavigation';

export default function Home() {
  const [searchParams, setSearchParams] = useSearchParams();
  const mediaType = searchParams.get('mediaType') || 'movie';
  const timeWindow = searchParams.get('timeWindow') || 'week';

  const mediaTypeTabs = [
    { id: 'movie', label: 'Movies' },
    { id: 'tv', label: 'TV Shows' }
  ];

  const timeWindowTabs = [
    { id: 'week', label: 'This Week' },
    { id: 'day', label: 'Today' }
  ];

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: mediaType === 'movie' ? ['trendingMovies', timeWindow] : ['trendingTVShows', timeWindow],
    queryFn: () => mediaType === 'movie' ? getTrendingMovies(timeWindow, 1) : getTrendingTVShows(timeWindow, 1),
  });

  const handleMediaTypeChange = (newMediaType) => {
    setSearchParams({ mediaType: newMediaType, timeWindow });
  };

  const handleTimeWindowChange = (newTimeWindow) => {
    setSearchParams({ mediaType, timeWindow: newTimeWindow });
  };

  const pageTitle = `Trending ${mediaType === 'movie' ? 'Movies' : 'TV Shows'} ${timeWindow === 'day' ? 'Today' : 'This Week'}`;

  if (isLoading) {
    return (
      <div>
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-gray-100 mb-6">
          {pageTitle}
        </h1>
        <div className="mb-4">
          <TabNavigation tabs={mediaTypeTabs} activeTab={mediaType} onTabChange={handleMediaTypeChange} />
        </div>
        <div className="mb-8">
          <TabNavigation tabs={timeWindowTabs} activeTab={timeWindow} onTabChange={handleTimeWindowChange} />
        </div>
        <MovieGridSkeleton count={18} />
      </div>
    );
  }

  if (error) {
    return <ErrorMessage message={error.message} onRetry={refetch} />;
  }

  const items = data?.results || [];

  if (items.length === 0) {
    return (
      <EmptyState
        title={`No trending ${mediaType === 'movie' ? 'movies' : 'TV shows'}`}
        message={`Check back later for trending ${mediaType === 'movie' ? 'movies' : 'TV shows'}.`}
      />
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          {pageTitle}
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Discover the most popular {mediaType === 'movie' ? 'movies' : 'TV shows'} right now
        </p>
      </div>

      <div className="mb-4">
        <TabNavigation tabs={mediaTypeTabs} activeTab={mediaType} onTabChange={handleMediaTypeChange} />
      </div>

      <div className="mb-8">
        <TabNavigation tabs={timeWindowTabs} activeTab={timeWindow} onTabChange={handleTimeWindowChange} />
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
    </div>
  );
}
