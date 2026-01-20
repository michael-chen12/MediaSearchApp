import { useQuery } from '@tanstack/react-query';
import { useParams, Link } from 'react-router-dom';
import { getMovieDetails, getMovieCredits, getSimilarMovies, getImageUrl } from '../api/tmdb';
import { MovieDetailSkeleton, MovieGridSkeleton } from '../components/common/LoadingSkeleton';
import ErrorMessage from '../components/common/ErrorMessage';
import MovieCard from '../components/common/MovieCard';
import { formatDate, formatRuntime, formatCurrency, formatRating, formatVoteCount } from '../utils/format';

export default function MovieDetail() {
  const { id } = useParams();

  const { data: movie, isLoading, error, refetch } = useQuery({
    queryKey: ['movieDetails', id],
    queryFn: () => getMovieDetails(id),
  });

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
