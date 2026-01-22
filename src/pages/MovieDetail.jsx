import { useQuery } from '@tanstack/react-query';
import { useParams, Link } from 'react-router-dom';
import { useEffect } from 'react';
import { getMovieDetails, getMovieCredits, getSimilarMovies, getImageUrl } from '../lib/tmdbClient';
import { events } from '../lib/analytics';
import { MovieDetailSkeleton } from '../components/common/LoadingSkeleton';
import ErrorMessage from '../components/common/ErrorMessage';
import MovieCard from '../components/common/MovieCard';
import { formatDate, formatRuntime, formatCurrency, formatRating, formatVoteCount } from '../utils/format';
import { useLists } from '../context/ListsContext';

export default function MovieDetail() {
  const { id } = useParams();
  const { isInSystemList, toggleSystemList } = useLists();

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
  const posterUrl = getImageUrl(movie.poster_path, 'poster', 'large');

  return (
    <div>
      <section className="relative w-screen left-1/2 -translate-x-1/2 -mt-8 mb-10">
        <div className="relative overflow-hidden">
          {backdropUrl ? (
            <img
              src={backdropUrl}
              alt={`${movie.title} backdrop`}
              className="absolute inset-0 h-full w-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 bg-gray-900" />
          )}
          <div className="absolute inset-0 bg-gradient-to-r from-gray-950/90 via-gray-950/60 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-gray-950/70 via-transparent to-transparent" />
          <div className="absolute inset-x-0 bottom-0 h-20 dark:bg-gradient-to-b dark:from-transparent dark:to-gray-900" />

          <div className="absolute right-6 top-6 z-20">
            <button
              onClick={() => toggleSystemList('watchlist', {
                id: movie.id,
                title: movie.title,
                poster_path: movie.poster_path,
                release_date: movie.release_date
              }, 'movie')}
              className="p-3 rounded-full bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm hover:bg-white dark:hover:bg-gray-800 transition-all shadow-lg hover:scale-110"
              aria-label={isInSystemList('watchlist', movie.id, 'movie') ? 'Remove from watchlist' : 'Add to watchlist'}
            >
              <svg className="w-6 h-6" fill={isInSystemList('watchlist', movie.id, 'movie') ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" className={isInSystemList('watchlist', movie.id, 'movie') ? 'text-blue-500' : 'text-gray-700 dark:text-gray-300'} />
              </svg>
            </button>
          </div>

          <div className="relative z-10 container mx-auto px-6 sm:px-8 lg:px-10 pt-4 sm:pt-6 md:pt-10 pb-5">
            <Link
              to="/"
              className="inline-flex items-center text-gray-200 hover:text-white transition-colors"
            >
              <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Home
            </Link>

            <div className="mt-4 sm:mt-6 max-w-5xl">
              <div className={`grid items-start gap-4 sm:gap-6 md:gap-8 ${posterUrl ? 'grid-cols-[auto_minmax(0,1fr)]' : ''}`}>
                {posterUrl && (
                  <div className="w-[140px] sm:w-[160px] md:w-[200px] lg:w-[220px] shrink-0 aspect-[2/3]">
                    <img
                      src={posterUrl}
                      alt={`${movie.title} poster`}
                      className="h-full w-full rounded-xl object-cover shadow-2xl ring-1 ring-white/10"
                    />
                  </div>
                )}

                <div className="text-gray-100">
                  <h1 className="text-2xl sm:text-3xl md:text-5xl font-bold leading-tight mb-2">
                    {movie.title}
                  </h1>

                  {movie.tagline && (
                    <p className="text-base sm:text-lg md:text-xl text-gray-200/80 italic mb-2">
                      "{movie.tagline}"
                    </p>
                  )}

                  {movie.vote_average > 0 && (
                    <div className="flex items-center gap-2 mb-3 sm:mb-4">
                      <span className="text-xl">⭐</span>
                      <span className="text-xl font-semibold">
                        {formatRating(movie.vote_average)}
                      </span>
                      <span className="text-gray-200/70">
                        ({formatVoteCount(movie.vote_count)} votes)
                      </span>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2 mb-4">
                    {movie.genres?.map((genre) => (
                      <span
                        key={genre.id}
                        className="px-3 py-1 rounded-full bg-white/10 text-white/90 text-xs font-semibold border border-white/10"
                      >
                        {genre.name}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mb-12">
        <div className="max-w-4xl">
          <p className="text-sm md:text-base text-gray-700 dark:text-gray-300 leading-relaxed">
            {movie.overview || 'No overview available.'}
          </p>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 text-sm text-gray-700 dark:text-gray-300">
            <div>
              <span className="font-semibold text-gray-900 dark:text-gray-100">Release Date:</span>{' '}
              {formatDate(movie.release_date)}
            </div>
            <div>
              <span className="font-semibold text-gray-900 dark:text-gray-100">Runtime:</span>{' '}
              {formatRuntime(movie.runtime)}
            </div>
            {movie.budget > 0 && (
              <div>
                <span className="font-semibold text-gray-900 dark:text-gray-100">Budget:</span>{' '}
                {formatCurrency(movie.budget)}
              </div>
            )}
            {movie.revenue > 0 && (
              <div>
                <span className="font-semibold text-gray-900 dark:text-gray-100">Revenue:</span>{' '}
                {formatCurrency(movie.revenue)}
              </div>
            )}
            {director && (
              <div className="sm:col-span-2">
                <span className="font-semibold text-gray-900 dark:text-gray-100">Director:</span>{' '}
                {director.name}
              </div>
            )}
          </div>
        </div>
      </section>

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
