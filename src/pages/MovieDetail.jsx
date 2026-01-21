import { useQuery } from '@tanstack/react-query';
import { useParams, Link } from 'react-router-dom';
import { useEffect } from 'react';
import { getMovieDetails, getMovieCredits, getSimilarMovies, getImageUrl } from '../lib/tmdbClient';
import { events } from '../lib/analytics';
import { MovieDetailSkeleton } from '../components/common/LoadingSkeleton';
import ErrorMessage from '../components/common/ErrorMessage';
import MovieCard from '../components/common/MovieCard';
import { formatDate, formatRuntime, formatCurrency, formatRating, formatVoteCount } from '../utils/format';
import { useFavorites } from '../context/FavoritesContext';
import { useWatchlist } from '../context/WatchlistContext';

export default function MovieDetail() {
  const { id } = useParams();
  const { isFavorite, toggleFavorite } = useFavorites();
  const { isInWatchlist, toggleWatchlist } = useWatchlist();

  const { data: movie, isLoading, error, refetch } = useQuery({
    queryKey: ['movieDetails', id],
    queryFn: () => getMovieDetails(id),
  });

  // Track content view (corporate pattern: track engagement)
  useEffect(() => {
    if (movie) {
      events.viewContent('movie', movie.id, movie.title);
    }
  }, [movie]);

  const { data: credits } = useQuery({
    queryKey: ['movieCredits', id],
    queryFn: () => getMovieCredits(id),
    enabled: !!movie,
  });

  const { data: similarMoviesData } = useQuery({
    queryKey: ['similarMovies', id],
    queryFn: () => getSimilarMovies(id, 1),
    enabled: !!movie,
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

  const backdropUrl = getImageUrl(movie.backdrop_path, 'backdrop', 'large');
  const posterUrl = getImageUrl(movie.poster_path, 'poster', 'large');
  const director = credits?.crew?.find((person) => person.job === 'Director');
  const cast = credits?.cast?.slice(0, 8) || [];
  const crewMembers = credits?.crew?.filter((person) => person.job && person.name) || [];
  const crewKeys = new Set();
  const uniqueCrew = crewMembers.filter((person) => {
    const key = `${person.id}-${person.job}`;
    if (crewKeys.has(key)) {
      return false;
    }
    crewKeys.add(key);
    return true;
  });
  const displayedCrew = uniqueCrew.slice(0, 12);
  const similarMovies = similarMoviesData?.results?.slice(0, 6) || [];

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
            alt={`${movie.title} backdrop`}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-white dark:from-gray-900 via-transparent to-transparent" />
          
          {/* Floating Action Buttons */}
          <div className="absolute top-4 right-4 flex gap-2">
            <button
              onClick={() => toggleFavorite({
                id: movie.id,
                title: movie.title,
                poster_path: movie.poster_path,
                release_date: movie.release_date
              }, 'movie')}
              className="p-3 rounded-full bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm hover:bg-white dark:hover:bg-gray-800 transition-all shadow-lg hover:scale-110"
              aria-label={isFavorite(movie.id, 'movie') ? 'Remove from favorites' : 'Add to favorites'}
            >
              <svg className="w-6 h-6" fill={isFavorite(movie.id, 'movie') ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" className={isFavorite(movie.id, 'movie') ? 'text-red-500' : 'text-gray-700 dark:text-gray-300'} />
              </svg>
            </button>
            
            <button
              onClick={() => toggleWatchlist({
                id: movie.id,
                title: movie.title,
                poster_path: movie.poster_path,
                release_date: movie.release_date
              }, 'movie')}
              className="p-3 rounded-full bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm hover:bg-white dark:hover:bg-gray-800 transition-all shadow-lg hover:scale-110"
              aria-label={isInWatchlist(movie.id, 'movie') ? 'Remove from watchlist' : 'Add to watchlist'}
            >
              <svg className="w-6 h-6" fill={isInWatchlist(movie.id, 'movie') ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" className={isInWatchlist(movie.id, 'movie') ? 'text-blue-500' : 'text-gray-700 dark:text-gray-300'} />
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
              alt={`${movie.title} poster`}
              className="w-full rounded-lg shadow-xl"
            />
          </div>
        )}

        <div>
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            {movie.title}
          </h1>

          {movie.tagline && (
            <p className="text-xl text-gray-600 dark:text-gray-400 italic mb-4">
              "{movie.tagline}"
            </p>
          )}

          <div className="flex flex-wrap items-center gap-4 mb-6">
            {movie.vote_average > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-2xl">⭐</span>
                <span className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
                  {formatRating(movie.vote_average)}
                </span>
                <span className="text-gray-600 dark:text-gray-400">
                  ({formatVoteCount(movie.vote_count)} votes)
                </span>
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-2 mb-6">
            {movie.genres?.map((genre) => (
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
              <span className="font-semibold">Release Date:</span> {formatDate(movie.release_date)}
            </div>
            <div>
              <span className="font-semibold">Runtime:</span> {formatRuntime(movie.runtime)}
            </div>
            {movie.budget > 0 && (
              <div>
                <span className="font-semibold">Budget:</span> {formatCurrency(movie.budget)}
              </div>
            )}
            {movie.revenue > 0 && (
              <div>
                <span className="font-semibold">Revenue:</span> {formatCurrency(movie.revenue)}
              </div>
            )}
            {director && (
              <div className="sm:col-span-2">
                <span className="font-semibold">Director:</span> {director.name}
              </div>
            )}
          </div>

          <div className="mb-6">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-3">
              Overview
            </h2>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
              {movie.overview || 'No overview available.'}
            </p>
          </div>
        </div>
      </div>

      {/* Collection Section */}
      {movie.belongs_to_collection && (
        <div className="mb-12">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-6">
            Part of Collection
          </h2>
          <Link
            to={`/collection/${movie.belongs_to_collection.id}`}
            className="flex items-center gap-6 p-6 bg-gradient-to-r from-primary-50 to-primary-100 dark:from-primary-900/20 dark:to-primary-800/20 rounded-xl hover:shadow-lg transition-shadow duration-300 group"
          >
            {movie.belongs_to_collection.poster_path && (
              <div className="w-24 flex-shrink-0">
                <img
                  src={getImageUrl(movie.belongs_to_collection.poster_path, 'poster', 'small')}
                  alt={movie.belongs_to_collection.name}
                  className="w-full rounded-lg shadow-md group-hover:shadow-xl transition-shadow duration-300"
                />
              </div>
            )}
            <div className="flex-1">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                {movie.belongs_to_collection.name}
              </h3>
              <p className="text-gray-600 dark:text-gray-400 flex items-center gap-2">
                View all movies in this collection
                <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </p>
            </div>
          </Link>
        </div>
      )}

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

      {displayedCrew.length > 0 && (
        <div className="mb-12">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-6">
            Crew
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {displayedCrew.map((person) => (
              <div
                key={`${person.id}-${person.job}`}
                className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 p-3"
              >
                <p className="font-medium text-sm text-gray-900 dark:text-gray-100 line-clamp-1">
                  {person.name}
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-1">
                  {person.job}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {similarMovies.length > 0 && (
        <div>
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-6">
            Similar Movies
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
            {similarMovies.map((movie) => (
              <MovieCard key={movie.id} movie={movie} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
