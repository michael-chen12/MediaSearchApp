import { useQuery, useQueries } from '@tanstack/react-query';
import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getTVShowDetails, getTVShowCredits, getSimilarTVShows, getTVSeasonDetails, getImageUrl } from '../lib/tmdbClient';
import { MovieDetailSkeleton } from '../components/common/LoadingSkeleton';
import ErrorMessage from '../components/common/ErrorMessage';
import TVShowCard from '../components/common/TVShowCard';
import { formatDate, formatRating, formatVoteCount } from '../utils/format';
import { useLists } from '../context/ListsContext';

export default function TVShowDetail() {
  const { id } = useParams();
  const { isInSystemList, toggleSystemList } = useLists();
  const [expandedSeasons, setExpandedSeasons] = useState([]);

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

  const normalizedExpandedSeasons = [...expandedSeasons].sort((a, b) => a - b);

  const seasonDetailsQueries = useQueries({
    queries: normalizedExpandedSeasons.map((seasonNumber) => ({
      queryKey: ['tvSeasonDetails', id, seasonNumber],
      queryFn: () => getTVSeasonDetails(id, seasonNumber),
      enabled: !!tvShow,
    })),
  });

  const seasonDetailsByNumber = normalizedExpandedSeasons.reduce((acc, seasonNumber, index) => {
    acc[seasonNumber] = seasonDetailsQueries[index];
    return acc;
  }, {});

  const toggleSeason = (seasonNumber) => {
    setExpandedSeasons((prev) => (
      prev.includes(seasonNumber)
        ? prev.filter((num) => num !== seasonNumber)
        : [...prev, seasonNumber]
    ));
  };

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
  const creators = tvShow.created_by || [];
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
  const similarTVShows = similarTVShowsData?.results?.slice(0, 6) || [];
  const seasons = tvShow.seasons?.filter(season => season.season_number > 0) || [];
  const posterUrl = getImageUrl(tvShow.poster_path, 'poster', 'large');

  return (
    <div>
      <section className="relative w-screen left-1/2 -translate-x-1/2 -mt-8 mb-12">
        <div className="relative min-h-[420px] md:min-h-[540px] overflow-hidden">
          {backdropUrl ? (
            <img
              src={backdropUrl}
              alt={`${tvShow.name} backdrop`}
              className="absolute inset-0 h-full w-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 bg-gray-900" />
          )}
          <div className="absolute inset-0 bg-gradient-to-r from-gray-950/90 via-gray-950/60 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-gray-950/70 via-transparent to-transparent" />
          <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-b from-transparent to-white dark:h-32 dark:from-transparent dark:to-gray-900" />

          <div className="absolute right-6 top-6 z-20">
            <button
              onClick={() => toggleSystemList('watchlist', {
                id: tvShow.id,
                name: tvShow.name,
                poster_path: tvShow.poster_path,
                first_air_date: tvShow.first_air_date,
                genre_ids: tvShow.genres?.map((genre) => genre.id).filter(Boolean),
                popularity: tvShow.popularity,
                vote_average: tvShow.vote_average
              }, 'tv')}
              className="p-3 rounded-full bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm hover:bg-white dark:hover:bg-gray-800 transition-all shadow-lg hover:scale-110"
              aria-label={isInSystemList('watchlist', tvShow.id, 'tv') ? 'Remove from watchlist' : 'Add to watchlist'}
            >
              <svg className="w-6 h-6" fill={isInSystemList('watchlist', tvShow.id, 'tv') ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" className={isInSystemList('watchlist', tvShow.id, 'tv') ? 'text-blue-500' : 'text-gray-700 dark:text-gray-300'} />
              </svg>
            </button>
          </div>

          <div className="relative z-10 container mx-auto px-6 sm:px-8 lg:px-10 py-8 md:py-12">
            <Link
              to="/"
              className="inline-flex items-center text-gray-200 hover:text-white transition-colors"
            >
              <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Home
            </Link>

            <div className="mt-6 max-w-5xl">
              <div className="flex flex-row items-center gap-4 sm:gap-6 md:gap-8">
                {posterUrl && (
                  <div className="w-32 sm:w-40 md:w-52 shrink-0">
                    <img
                      src={posterUrl}
                      alt={`${tvShow.name} poster`}
                      className="w-full rounded-xl shadow-2xl ring-1 ring-white/10"
                    />
                  </div>
                )}

                <div className="min-w-0 text-gray-100 flex flex-col justify-center">
                  <div className="flex items-center justify-center sm:justify-start min-h-[3.5rem] sm:min-h-[4.5rem] md:min-h-[6rem] mb-2">
                    <h1 className="w-full text-center sm:text-left text-3xl md:text-5xl font-bold">
                      {tvShow.name}
                    </h1>
                  </div>

                  <div className="hidden sm:block">
                    {tvShow.tagline && (
                      <p className="text-lg md:text-xl text-gray-200/80 italic mb-3">
                        "{tvShow.tagline}"
                      </p>
                    )}

                    {tvShow.vote_average > 0 && (
                      <div className="flex items-center gap-2 mb-4">
                        <span className="text-xl">⭐</span>
                        <span className="text-xl font-semibold">
                          {formatRating(tvShow.vote_average)}
                        </span>
                        <span className="text-gray-200/70">
                          ({formatVoteCount(tvShow.vote_count)} votes)
                        </span>
                      </div>
                    )}

                    <div className="flex flex-wrap gap-2 mb-4">
                      {tvShow.genres?.map((genre) => (
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

              <div className="mt-4 text-gray-100 sm:hidden">
                {tvShow.tagline && (
                  <p className="text-lg text-gray-200/80 italic mb-3">
                    "{tvShow.tagline}"
                  </p>
                )}

                {tvShow.vote_average > 0 && (
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-xl">⭐</span>
                    <span className="text-xl font-semibold">
                      {formatRating(tvShow.vote_average)}
                    </span>
                    <span className="text-gray-200/70">
                      ({formatVoteCount(tvShow.vote_count)} votes)
                    </span>
                  </div>
                )}

                <div className="flex flex-wrap gap-2">
                  {tvShow.genres?.map((genre) => (
                    <span
                      key={genre.id}
                      className="px-3 py-1 rounded-full bg-white/10 text-white/90 text-xs font-semibold border border-white/10"
                    >
                      {genre.name}
                    </span>
                  ))}
                </div>
              </div>

              <div className="mt-6 max-w-3xl text-gray-100">
                <p className="text-sm md:text-base text-gray-200/80 leading-relaxed line-clamp-4">
                  {tvShow.overview || 'No overview available.'}
                </p>

                <div className="mt-5 grid gap-2 sm:grid-cols-2 text-sm text-gray-200/85">
                  <div>
                    <span className="font-semibold text-white">First Air Date:</span>{' '}
                    {formatDate(tvShow.first_air_date)}
                  </div>
                  {tvShow.status && (
                    <div>
                      <span className="font-semibold text-white">Status:</span>{' '}
                      {tvShow.status}
                    </div>
                  )}
                  {tvShow.number_of_seasons && (
                    <div>
                      <span className="font-semibold text-white">Seasons:</span>{' '}
                      {tvShow.number_of_seasons}
                    </div>
                  )}
                  {tvShow.number_of_episodes && (
                    <div>
                      <span className="font-semibold text-white">Episodes:</span>{' '}
                      {tvShow.number_of_episodes}
                    </div>
                  )}
                  {creators.length > 0 && (
                    <div className="sm:col-span-2">
                      <span className="font-semibold text-white">Created by:</span>{' '}
                      {creators.map((creator) => creator.name).join(', ')}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

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
                  <button
                    type="button"
                    onClick={() => toggleSeason(season.season_number)}
                    className="mt-3 text-sm font-medium text-primary-600 dark:text-primary-400 hover:underline"
                    aria-expanded={expandedSeasons.includes(season.season_number)}
                  >
                    {expandedSeasons.includes(season.season_number) ? 'Hide Episodes' : 'Show Episodes'}
                  </button>
                  {expandedSeasons.includes(season.season_number) && (
                    <div className="mt-3 border-t border-gray-200 dark:border-gray-700 pt-3">
                      {seasonDetailsByNumber[season.season_number]?.isLoading && (
                        <p className="text-sm text-gray-600 dark:text-gray-400">Loading episodes...</p>
                      )}
                      {seasonDetailsByNumber[season.season_number]?.error && (
                        <p className="text-sm text-red-600 dark:text-red-400">Failed to load episodes.</p>
                      )}
                      {seasonDetailsByNumber[season.season_number]?.data && (
                        <>
                          {seasonDetailsByNumber[season.season_number].data.episodes?.length ? (
                            <ul className="space-y-2">
                              {seasonDetailsByNumber[season.season_number].data.episodes.map((episode) => (
                                <li key={episode.id} className="flex flex-col gap-1">
                                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                    E{episode.episode_number}. {episode.name}
                                  </span>
                                  <span className="text-xs text-gray-600 dark:text-gray-400">
                                    {episode.air_date ? formatDate(episode.air_date) : 'Air date TBD'}
                                  </span>
                                  {episode.overview && (
                                    <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2">
                                      {episode.overview}
                                    </p>
                                  )}
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              No episode details available.
                            </p>
                          )}
                        </>
                      )}
                    </div>
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
