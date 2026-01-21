import { useSearchParams, Link } from 'react-router-dom';
import { useFavorites } from '../context/FavoritesContext';
import TabNavigation from '../components/common/navigation/TabNavigation';
import MovieCard from '../components/common/MovieCard';
import TVShowCard from '../components/common/TVShowCard';
import EmptyState from '../components/common/EmptyState';
import Button from '../components/base/Button';

export default function Favorites() {
  const [searchParams, setSearchParams] = useSearchParams();
  const mediaType = searchParams.get('mediaType') || 'movie';
  const { getFavorites, removeFavorite } = useFavorites();

  const movieFavorites = getFavorites('movie');
  const tvFavorites = getFavorites('tv');

  const tabs = [
    { id: 'movie', label: 'Movies', count: movieFavorites.length },
    { id: 'tv', label: 'TV Shows', count: tvFavorites.length }
  ];

  const currentFavorites = mediaType === 'movie' ? movieFavorites : tvFavorites;
  const handleTabChange = (newMediaType) => {
    setSearchParams({ mediaType: newMediaType });
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          My Favorites
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          {currentFavorites.length} {mediaType === 'movie' ? 'movies' : 'TV shows'} saved
        </p>
      </div>

      <div className="mb-8">
        <TabNavigation tabs={tabs} activeTab={mediaType} onTabChange={handleTabChange} />
      </div>

      {currentFavorites.length === 0 ? (
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
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
          {currentFavorites.map((item) =>
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
