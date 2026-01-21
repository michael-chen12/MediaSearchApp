import { useMemo, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useFavorites } from '../context/FavoritesContext';
import TabNavigation from '../components/common/navigation/TabNavigation';
import MovieCard from '../components/common/MovieCard';
import TVShowCard from '../components/common/TVShowCard';
import EmptyState from '../components/common/EmptyState';
import { MovieGridSkeleton } from '../components/common/LoadingSkeleton';
import Button from '../components/base/Button';

export default function Favorites() {
  const [searchParams, setSearchParams] = useSearchParams();
  const mediaType = searchParams.get('mediaType') || 'movie';
  const { getFavorites, removeFavorite, isLoading, warning, source } = useFavorites();
  const [sortBy, setSortBy] = useState('recent');
  const [filterQuery, setFilterQuery] = useState('');

  const movieFavorites = getFavorites('movie');
  const tvFavorites = getFavorites('tv');

  const tabs = [
    { id: 'movie', label: 'Movies', count: movieFavorites.length },
    { id: 'tv', label: 'TV Shows', count: tvFavorites.length }
  ];

  const currentFavorites = mediaType === 'movie' ? movieFavorites : tvFavorites;
  const visibleFavorites = useMemo(() => {
    const normalizedQuery = filterQuery.trim().toLowerCase();
    const filtered = normalizedQuery
      ? currentFavorites.filter((item) =>
          (item.title || item.name || '').toLowerCase().includes(normalizedQuery)
        )
      : currentFavorites;

    if (sortBy === 'title') {
      return [...filtered].sort((a, b) => {
        const aTitle = (a.title || a.name || '').toLowerCase();
        const bTitle = (b.title || b.name || '').toLowerCase();
        return aTitle.localeCompare(bTitle);
      });
    }

    if (sortBy === 'release') {
      return [...filtered].sort((a, b) => {
        const aDate = new Date(a.release_date || a.first_air_date || 0).getTime();
        const bDate = new Date(b.release_date || b.first_air_date || 0).getTime();
        return bDate - aDate;
      });
    }

    return filtered;
  }, [currentFavorites, filterQuery, sortBy]);
  const handleTabChange = (newMediaType) => {
    setSearchParams({ mediaType: newMediaType });
  };

  return (
    <div>
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            My Favorites
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {currentFavorites.length} {mediaType === 'movie' ? 'movies' : 'TV shows'} saved
          </p>
        </div>
        <span
          className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
            source === 'remote'
              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
              : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300'
          }`}
        >
          {source === 'remote' ? 'Synced' : 'Local'}
        </span>
      </div>

      {warning && (
        <div className="mb-6 rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-800 dark:border-yellow-900/50 dark:bg-yellow-900/30 dark:text-yellow-200">
          {warning}
        </div>
      )}

      <div className="mb-8">
        <TabNavigation tabs={tabs} activeTab={mediaType} onTabChange={handleTabChange} />
      </div>

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600 dark:text-gray-400" htmlFor="favorites-filter">
            Filter
          </label>
          <input
            id="favorites-filter"
            type="text"
            value={filterQuery}
            onChange={(event) => setFilterQuery(event.target.value)}
            placeholder="Search titles"
            className="w-full sm:w-60 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600 dark:text-gray-400" htmlFor="favorites-sort">
            Sort by
          </label>
          <select
            id="favorites-sort"
            value={sortBy}
            onChange={(event) => setSortBy(event.target.value)}
            className="rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="recent">Recently added</option>
            <option value="title">Title</option>
            <option value="release">Release date</option>
          </select>
        </div>
      </div>

      {isLoading && currentFavorites.length === 0 ? (
        <MovieGridSkeleton />
      ) : currentFavorites.length === 0 ? (
        <EmptyState
          title={`No ${mediaType === 'movie' ? 'movies' : 'TV shows'} in favorites`}
          message={`Start adding ${mediaType === 'movie' ? 'movies' : 'TV shows'} you love to see them here!`}
        >
          <Link
            to="/"
            className="inline-block mt-4 px-6 py-3 bg-primary-600 hover:bg-primary-700 dark:bg-primary-500 dark:hover:bg-primary-600 text-white rounded-lg transition-colors"
          >
            Explore {mediaType === 'movie' ? 'Movies' : 'TV Shows'}
          </Link>
        </EmptyState>
      ) : visibleFavorites.length === 0 ? (
        <EmptyState
          title="No matches"
          message="Try a different search or clear the filter."
        />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
          {visibleFavorites.map((item) =>
            mediaType === 'movie' ? (
              <div key={item.id} className="flex flex-col gap-2">
                <MovieCard movie={item} />
                <Button
                  variant="secondary"
                  size="sm"
                  className="w-full"
                  onClick={() => removeFavorite(item.id, 'movie')}
                  aria-label={`Remove ${item.title} from favorites`}
                >
                  Remove
                </Button>
              </div>
            ) : (
              <div key={item.id} className="flex flex-col gap-2">
                <TVShowCard tvShow={item} />
                <Button
                  variant="secondary"
                  size="sm"
                  className="w-full"
                  onClick={() => removeFavorite(item.id, 'tv')}
                  aria-label={`Remove ${item.name} from favorites`}
                >
                  Remove
                </Button>
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
}
