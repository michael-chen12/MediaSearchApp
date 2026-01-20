import { useQuery } from '@tanstack/react-query';
import { useParams, Link } from 'react-router-dom';
import { getPersonDetails, getPersonCredits, getImageUrl } from '../lib/tmdbClient';
import { MovieDetailSkeleton } from '../components/common/LoadingSkeleton';
import ErrorMessage from '../components/common/ErrorMessage';
import MovieCard from '../components/common/MovieCard';
import TVShowCard from '../components/common/TVShowCard';
import { formatDate } from '../utils/format';

export default function PersonDetail() {
  const { id } = useParams();

  const { data: person, isLoading, error, refetch } = useQuery({
    queryKey: ['personDetails', id],
    queryFn: () => getPersonDetails(id),
  });

  const { data: credits } = useQuery({
    queryKey: ['personCredits', id],
    queryFn: () => getPersonCredits(id),
    enabled: !!person,
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

  const profileUrl = getImageUrl(person.profile_path, 'profile', 'large');
  
  // Calculate age if birthday is available
  const calculateAge = (birthday) => {
    if (!birthday) return null;
    const today = new Date();
    const birthDate = new Date(birthday);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const age = calculateAge(person.birthday);

  // Process filmography
  const movieCredits = credits?.cast?.filter(credit => credit.media_type === 'movie') || [];
  const tvCredits = credits?.cast?.filter(credit => credit.media_type === 'tv') || [];

  // Sort by date descending (most recent first)
  const sortedMovies = [...movieCredits].sort((a, b) => {
    const dateA = new Date(a.release_date || '1900-01-01');
    const dateB = new Date(b.release_date || '1900-01-01');
    return dateB - dateA;
  });

  const sortedTVShows = [...tvCredits].sort((a, b) => {
    const dateA = new Date(a.first_air_date || '1900-01-01');
    const dateB = new Date(b.first_air_date || '1900-01-01');
    return dateB - dateA;
  });

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

      <div className="grid md:grid-cols-[300px,1fr] gap-8 mb-12">
        <div>
          <div className="aspect-[2/3] rounded-lg overflow-hidden bg-gray-200 dark:bg-gray-700 shadow-xl mb-4">
            {profileUrl ? (
              <img
                src={profileUrl}
                alt={`${person.name} profile`}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400 dark:text-gray-600">
                <svg className="w-24 h-24" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                </svg>
              </div>
            )}
          </div>
        </div>

        <div>
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-gray-100 mb-4">
            {person.name}
          </h1>

          <div className="grid sm:grid-cols-2 gap-4 mb-6 text-gray-700 dark:text-gray-300">
            {person.known_for_department && (
              <div>
                <span className="font-semibold">Known For:</span> {person.known_for_department}
              </div>
            )}
            {person.birthday && (
              <div>
                <span className="font-semibold">Birthday:</span> {formatDate(person.birthday)}
                {age && ` (${age} years old)`}
              </div>
            )}
            {person.place_of_birth && (
              <div className="sm:col-span-2">
                <span className="font-semibold">Place of Birth:</span> {person.place_of_birth}
              </div>
            )}
          </div>

          {person.biography && (
            <div className="mb-6">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-3">
                Biography
              </h2>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-line">
                {person.biography}
              </p>
            </div>
          )}
        </div>
      </div>

      {sortedMovies.length > 0 && (
        <div className="mb-12">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-6">
            Movies ({sortedMovies.length})
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
            {sortedMovies.slice(0, 18).map((movie) => (
              <MovieCard key={`${movie.id}-${movie.credit_id}`} movie={movie} />
            ))}
          </div>
          {sortedMovies.length > 18 && (
            <p className="text-center text-gray-600 dark:text-gray-400 mt-6">
              Showing 18 of {sortedMovies.length} movies
            </p>
          )}
        </div>
      )}

      {sortedTVShows.length > 0 && (
        <div>
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-6">
            TV Shows ({sortedTVShows.length})
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
            {sortedTVShows.slice(0, 18).map((tvShow) => (
              <TVShowCard key={`${tvShow.id}-${tvShow.credit_id}`} tvShow={tvShow} />
            ))}
          </div>
          {sortedTVShows.length > 18 && (
            <p className="text-center text-gray-600 dark:text-gray-400 mt-6">
              Showing 18 of {sortedTVShows.length} TV shows
            </p>
          )}
        </div>
      )}
    </div>
  );
}
