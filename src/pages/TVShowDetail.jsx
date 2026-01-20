import { useQuery } from '@tanstack/react-query';
import { useParams, Link } from 'react-router-dom';
import { getTVShowDetails, getTVShowCredits, getSimilarTVShows, getImageUrl } from '../lib/tmdbClient';
import { MovieDetailSkeleton, MovieGridSkeleton } from '../components/common/LoadingSkeleton';
import ErrorMessage from '../components/common/ErrorMessage';
import TVShowCard from '../components/common/TVShowCard';
import { formatDate, formatRating, formatVoteCount } from '../utils/format';
import { useFavorites } from '../context/FavoritesContext';
import { useWatchlist } from '../context/WatchlistContext';

export default function TVShowDetail() {
  const { id } = useParams();
  const { isFavorite, toggleFavorite } = useFavorites();
  const { isInWatchlist, toggleWatchlist } = useWatchlist();

  const { data: tvShow, isLoading, error, refetch } = useQuery({
    queryKey: ['tvShowDetails', id],
    queryFn: () => getTVShowDetails(id),
  });

  const { data: credits } = useQuery({
    queryKey: ['tvShowCredits', id],
    queryFn: () => getTVShowCredits(id),
    enabled: !!tvShow,
  });

  const { data: similarTVShowsData } = useQuery({
    queryKey: ['similarTVShows', id],
    queryFn: () => getSimilarTVShows(id, 1),
    enabled: !!tvShow,
  });

  if (isLoading) {
    return (
      <div>
        <Link
          to="/"
          className="inline-flex items-center text-primary-600 dark:text-primary-400 hover:underline mb-4"
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
      <div>
        <Link
          to="/"
          className="inline-flex items-center text-primary-600 dark:text-primary-400 hover:underline mb-4"
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

  const backdropUrl = getImageUrl(tvShow.backdrop_path, 'backdrop', 'large');
  const posterUrl = getImageUrl(tvShow.poster_path, 'poster', 'large');
  const creators = tvShow.created_by || [];
  const cast = credits?.cast?.slice(0, 8) || [];
  const similarTVShows = similarTVShowsData?.results?.slice(0, 6) || [];
  const seasons = tvShow.seasons?.filter(season => season.season_number > 0) || [];

  return (
    <div>
      <Link
        to="/"
        className="inline-flex items-center text-primary-600 dark:text-primary-400 hover:underline mb-6"
      >
        <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to Home
      </Link>

      {backdropUrl && (
        <div className="relative h-[300px] md:h-[400px] rounded-xl overflow-hidden mb-8 bg-gray-200 dark:bg-gray-800">
          <img
            src={backdropUrl}
            alt={`${tvShow.name} backdrop`}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-white dark:from-gray-900 via-transparent to-transparent" />
          
          {/* Floating Action Buttons */}
          <div className="absolute top-4 right-4 flex gap-2">
            <button
              onClick={() => toggleFavorite({
                id: tvShow.id,
                name: tvShow.name,
                poster_path: tvShow.poster_path,
                first_air_date: tvShow.first_air_date
              }, 'tv')}
              className="p-3 rounded-full bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm hover:bg-white dark:hover:bg-gray-800 transition-all shadow-lg hover:scale-110"
              aria-label={isFavorite(tvShow.id, 'tv') ? 'Remove from favorites' : 'Add to favorites'}
            >
              <svg className="w-6 h-6" fill={isFavorite(tvShow.id, 'tv') ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" className={isFavorite(tvShow.id, 'tv') ? 'text-red-500' : 'text-gray-700 dark:text-gray-300'} />
              </svg>
            </button>
            
            <button
              onClick={() => toggleWatchlist({
                id: tvShow.id,
                name: tvShow.name,
                poster_path: tvShow.poster_path,
                first_air_date: tvShow.first_air_date
              }, 'tv')}
              className="p-3 rounded-full bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm hover:bg-white dark:hover:bg-gray-800 transition-all shadow-lg hover:scale-110"
              aria-label={isInWatchlist(tvShow.id, 'tv') ? 'Remove from watchlist' : 'Add to watchlist'}
            >
              <svg className="w-6 h-6" fill={isInWatchlist(tvShow.id, 'tv') ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" className={isInWatchlist(tvShow.id, 'tv') ? 'text-blue-500' : 'text-gray-700 dark:text-gray-300'} />
              </svg>
            </button>
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-[300px,1fr] gap-8 mb-12">
        {posterUrl && (
          <div className="hidden md:block">
            <img
              src={posterUrl}
              alt={`${tvShow.name} poster`}
              className="w-full rounded-lg shadow-xl"
            />
          </div>
        )}

        <div>
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            {tvShow.name}
          </h1>

          {tvShow.tagline && (
            <p className="text-xl text-gray-600 dark:text-gray-400 italic mb-4">
              "{tvShow.tagline}"
            </p>
          )}

          <div className="flex flex-wrap items-center gap-4 mb-6">
            {tvShow.vote_average > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-2xl">⭐</span>
                <span className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
                  {formatRating(tvShow.vote_average)}
                </span>
                <span className="text-gray-600 dark:text-gray-400">
                  ({formatVoteCount(tvShow.vote_count)} votes)
                </span>
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-2 mb-6">
            {tvShow.genres?.map((genre) => (
              <span
                key={genre.id}
                className="px-3 py-1 bg-primary-100 dark:bg-primary-900/30 text-primary-800 dark:text-primary-300 rounded-full text-sm font-medium"
              >
                {genre.name}
              </span>
            ))}
          </div>

          <div className="grid sm:grid-cols-2 gap-4 mb-6 text-gray-700 dark:text-gray-300">
            <div>
              <span className="font-semibold">First Air Date:</span> {formatDate(tvShow.first_air_date)}
            </div>
            {tvShow.status && (
              <div>
                <span className="font-semibold">Status:</span> {tvShow.status}
              </div>
            )}
            {tvShow.number_of_seasons && (
              <div>
                <span className="font-semibold">Seasons:</span> {tvShow.number_of_seasons}
              </div>
            )}
            {tvShow.number_of_episodes && (
              <div>
                <span className="font-semibold">Episodes:</span> {tvShow.number_of_episodes}
              </div>
            )}
            {creators.length > 0 && (
              <div className="sm:col-span-2">
                <span className="font-semibold">Created by:</span>{' '}
                {creators.map(creator => creator.name).join(', ')}
              </div>
            )}
          </div>

          <div className="mb-6">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-3">
              Overview
            </h2>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
              {tvShow.overview || 'No overview available.'}
            </p>
          </div>
        </div>
      </div>

      {cast.length > 0 && (
        <div className="mb-12">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-6">
            Cast
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4">
            {cast.map((person) => (
              <div key={person.id} className="text-center">
                <div className="aspect-[2/3] rounded-lg overflow-hidden bg-gray-200 dark:bg-gray-700 mb-2">
                  {person.profile_path ? (
                    <img
                      src={getImageUrl(person.profile_path, 'profile', 'small')}
                      alt={person.name}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400 dark:text-gray-600">
                      <svg className="w-12 h-12" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                      </svg>
                    </div>
                  )}
                </div>
                <p className="font-medium text-sm text-gray-900 dark:text-gray-100 line-clamp-1">
                  {person.name}
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-1">
                  {person.character}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {seasons.length > 0 && (
        <div className="mb-12">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-6">
            Seasons
          </h2>
          <div className="space-y-4">
            {seasons.map((season) => (
              <div
                key={season.id}
                className="flex gap-4 p-4 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
              >
                <div className="flex-shrink-0 w-24">
                  <div className="aspect-[2/3] rounded overflow-hidden bg-gray-200 dark:bg-gray-700">
                    {season.poster_path ? (
                      <img
                        src={getImageUrl(season.poster_path, 'poster', 'small')}
                        alt={`${season.name} poster`}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400 dark:text-gray-600">
                        <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                          <path d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
                        </svg>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">
                    {season.name}
                  </h3>
                  {season.air_date && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                      Aired: {formatDate(season.air_date)}
                    </p>
                  )}
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                    {season.episode_count} {season.episode_count === 1 ? 'Episode' : 'Episodes'}
                  </p>
                  {season.overview && (
                    <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-2">
                      {season.overview}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {similarTVShows.length > 0 && (
        <div>
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-6">
            Similar TV Shows
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
            {similarTVShows.map((show) => (
              <TVShowCard key={show.id} tvShow={show} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
