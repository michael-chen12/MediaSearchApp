import { useQuery, useQueries } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getTVShowDetails, getTVShowCredits, getSimilarTVShows, getTVSeasonDetails, getImageUrl } from '../lib/tmdbClient';
import { MovieDetailSkeleton } from '../components/common/LoadingSkeleton';
import ErrorMessage from '../components/common/ErrorMessage';
import TVShowCard from '../components/common/TVShowCard';
import { formatDate, formatEpisode, formatRating, formatVoteCount } from '../utils/format';
import { useLists } from '../context/ListsContext';
import { useWatchProgress } from '../context/WatchProgressContext';
import TabNavigation from '../components/common/navigation/TabNavigation';
import TVShowProgress from '../components/common/TVShowProgress';
import ProgressBar from '../components/common/ProgressBar';

export default function TVShowDetail() {
  const { id } = useParams();
  const { isInSystemList, toggleSystemList } = useLists();
  const { getProgress, progressByMediaId } = useWatchProgress();
  const [activeTab, setActiveTab] = useState('seasons');
  const [expandedSeasons, setExpandedSeasons] = useState([]);
  const [focusEpisode, setFocusEpisode] = useState(null);

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

  const seasons = useMemo(() => (
    tvShow?.seasons?.filter((season) => season.season_number > 0) || []
  ), [tvShow]);

  const seasonNumbers = useMemo(() => (
    [...new Set(seasons
      .map((season) => season.season_number)
      .filter(Number.isFinite))]
      .sort((a, b) => a - b)
  ), [seasons]);

  const seasonDetailsQueries = useQueries({
    queries: seasonNumbers.map((seasonNumber) => ({
      queryKey: ['tvSeasonDetails', id, seasonNumber],
      queryFn: () => getTVSeasonDetails(id, seasonNumber),
      enabled: Boolean(tvShow) && expandedSeasons.includes(seasonNumber),
      staleTime: 1000 * 60 * 60 * 24,
    })),
  });

  const seasonDetailsByNumber = seasonNumbers.reduce((acc, seasonNumber, index) => {
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
  const posterUrl = getImageUrl(tvShow.poster_path, 'poster', 'large');
  const progress = getProgress(id);
  const totalEpisodes = Number.isFinite(tvShow.number_of_episodes)
    ? tvShow.number_of_episodes
    : progress.totalEpisodes;
  const watchedEpisodes = Number.isFinite(progress.watchedEpisodes)
    ? progress.watchedEpisodes
    : 0;
  const overallTotalEpisodes = totalEpisodes;
  const overallWatchedEpisodes = overallTotalEpisodes > 0
    ? Math.min(watchedEpisodes, overallTotalEpisodes)
    : watchedEpisodes;
  const overallProgressPercentage = overallTotalEpisodes > 0
    ? Math.round((overallWatchedEpisodes / overallTotalEpisodes) * 100)
    : 0;
  const overallProgressLabel = overallTotalEpisodes > 0
    ? `${overallWatchedEpisodes}/${overallTotalEpisodes} episodes (${overallProgressPercentage}%)`
    : 'No progress yet';
  const mediaProgress = progressByMediaId?.[String(id)] || {};
  const nextUnwatchedEpisode = seasons.reduce((nextEpisode, season) => {
    if (nextEpisode) return nextEpisode;
    const seasonNumber = season.season_number;
    const episodeCount = Number(season.episode_count) || 0;
    if (!seasonNumber || episodeCount <= 0) return nextEpisode;
    for (let episodeNumber = 1; episodeNumber <= episodeCount; episodeNumber += 1) {
      const entry = mediaProgress?.[String(seasonNumber)]?.[String(episodeNumber)];
      if (!entry?.watched) {
        return { season: seasonNumber, episode: episodeNumber };
      }
    }
    return nextEpisode;
  }, null);
  const fallbackSeasonNumber = seasonNumbers[0];
  const shouldFallbackToFirst = !nextUnwatchedEpisode
    && progress.totalEpisodes === 0
    && Number.isFinite(fallbackSeasonNumber);
  const nextEpisodeTarget = nextUnwatchedEpisode
    || (shouldFallbackToFirst ? { season: fallbackSeasonNumber, episode: 1 } : null);
  const continueWatchingLabel = nextEpisodeTarget
    ? `Continue ${formatEpisode(nextEpisodeTarget.season, nextEpisodeTarget.episode)}`
    : 'All caught up';

  const handleContinueWatching = () => {
    if (!nextEpisodeTarget) return;
    setActiveTab('seasons');
    setExpandedSeasons((prev) => (
      prev.includes(nextEpisodeTarget.season) ? prev : [...prev, nextEpisodeTarget.season]
    ));
    setFocusEpisode(nextEpisodeTarget);
  };

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

      <section className="mb-12">
        <TabNavigation
          tabs={[
            { id: 'seasons', label: 'Seasons' },
            { id: 'cast', label: 'Cast' },
            { id: 'crew', label: 'Key Crew' },
            { id: 'similar', label: 'Similar' },
          ]}
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />

        <div className="mt-6">
          {activeTab === 'seasons' && (
            <div role="tabpanel" id="seasons-panel" aria-labelledby="seasons-tab">
              <div className="mb-6 rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900 sm:p-6">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex-1">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-3">
                      Progress
                    </h2>
                    <ProgressBar
                      current={overallWatchedEpisodes}
                      total={overallTotalEpisodes}
                      label={overallProgressLabel}
                      size="md"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleContinueWatching}
                    disabled={!nextEpisodeTarget}
                    className="inline-flex items-center justify-center rounded-full bg-primary-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-primary-500 dark:hover:bg-primary-600"
                  >
                    {continueWatchingLabel}
                  </button>
                </div>
                {nextEpisodeTarget && (
                  <p className="mt-3 text-sm text-gray-600 dark:text-gray-400">
                    Next up: {formatEpisode(nextEpisodeTarget.season, nextEpisodeTarget.episode)}
                  </p>
                )}
              </div>

              {seasons.length > 0 ? (
                <TVShowProgress
                  tvShowId={Number(id)}
                  seasons={seasons}
                  seasonDetailsByNumber={seasonDetailsByNumber}
                  expandedSeasons={expandedSeasons}
                  onToggleSeason={toggleSeason}
                  focusEpisode={focusEpisode}
                />
              ) : (
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  No season details available.
                </p>
              )}
            </div>
          )}

          {activeTab === 'cast' && (
            <div role="tabpanel" id="cast-panel" aria-labelledby="cast-tab">
              {cast.length > 0 ? (
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
              ) : (
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  No cast details available.
                </p>
              )}
            </div>
          )}

          {activeTab === 'crew' && (
            <div role="tabpanel" id="crew-panel" aria-labelledby="crew-tab">
              {displayedCrew.length > 0 ? (
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
              ) : (
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  No crew details available.
                </p>
              )}
            </div>
          )}

          {activeTab === 'similar' && (
            <div role="tabpanel" id="similar-panel" aria-labelledby="similar-tab">
              {similarTVShows.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
                  {similarTVShows.map((show) => (
                    <TVShowCard key={show.id} tvShow={show} />
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  No similar shows to recommend yet.
                </p>
              )}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
