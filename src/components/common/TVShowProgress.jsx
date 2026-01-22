import { useEffect, useMemo, useState, useRef } from 'react';
import { Grid } from 'react-window';
import { getImageUrl } from '../../lib/tmdbClient';
import { formatDate, formatEpisode } from '../../utils/format';
import { useWatchProgress } from '../../context/WatchProgressContext';
import ProgressBar from './ProgressBar';

const resolveSeasonDetails = (details) => {
  if (!details) return { episodes: [], isLoading: false, error: null };
  if (Array.isArray(details.episodes)) {
    return { episodes: details.episodes, isLoading: Boolean(details.isLoading), error: details.error };
  }
  if (details.data && Array.isArray(details.data.episodes)) {
    return { episodes: details.data.episodes, isLoading: Boolean(details.isLoading), error: details.error };
  }
  return { episodes: [], isLoading: Boolean(details.isLoading), error: details.error };
};

const EpisodeCard = ({ 
  episode, 
  seasonNumber, 
  seasonLabel,
  tvShowId, 
  isWatched, 
  isFocused, 
  onToggle 
}) => {
  const stillUrl = getImageUrl(episode.still_path, 'backdrop', 'small');
  
  return (
    <li
      id={`episode-${tvShowId}-${seasonNumber}-${episode.episode_number}`}
      className={`rounded-lg border transition ${
        isWatched
          ? 'border-emerald-200 bg-emerald-50 dark:border-emerald-500/40 dark:bg-emerald-500/10'
          : 'border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900'
      } ${isFocused ? 'ring-2 ring-primary-400 ring-offset-2 ring-offset-white dark:ring-offset-gray-900' : ''}`}
    >
      <div
        className="cursor-pointer"
        role="button"
        tabIndex={0}
        onClick={onToggle}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            onToggle();
          }
        }}
        aria-pressed={isWatched}
      >
        <div className="aspect-[16/9] w-full overflow-hidden rounded-t-lg bg-gray-200 dark:bg-gray-800">
          {stillUrl ? (
            <img
              src={stillUrl}
              alt={episode.name || 'Episode still'}
              className="h-full w-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-gray-400 dark:text-gray-600">
              <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 7h16M4 17h16M6 7v10M18 7v10" />
              </svg>
            </div>
          )}
        </div>
        <div className="p-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                {formatEpisode(seasonNumber, episode.episode_number)}
              </p>
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 line-clamp-2">
                {episode.name || 'Untitled Episode'}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {episode.air_date ? formatDate(episode.air_date) : 'Air date TBD'}
              </p>
            </div>
            <input
              type="checkbox"
              checked={isWatched}
              onChange={onToggle}
              onClick={(event) => event.stopPropagation()}
              className="mt-1 h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-900"
              aria-label={`Mark ${seasonLabel} ${episode.name || 'episode'} as watched`}
            />
          </div>
        </div>
      </div>
    </li>
  );
};

const VirtualizedEpisodeGrid = ({ 
  episodes, 
  seasonNumber, 
  seasonLabel,
  tvShowId, 
  seasonProgress, 
  focusEpisode, 
  onToggle 
}) => {
  const containerRef = useRef(null);
  const [dimensions, setDimensions] = useState({ width: 0, columnCount: 3 });

  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const width = containerRef.current.offsetWidth;
        const columnCount = width < 640 ? 1 : width < 1024 ? 2 : 3;
        setDimensions({ width, columnCount });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  const rowCount = Math.ceil(episodes.length / dimensions.columnCount);
  const ITEM_HEIGHT = 280;
  const GAP = 16;

  const Cell = ({ columnIndex, rowIndex, style }) => {
    const index = rowIndex * dimensions.columnCount + columnIndex;
    if (index >= episodes.length) return null;

    const episode = episodes[index];
    const episodeKey = String(episode.episode_number);
    const isWatched = Boolean(seasonProgress?.[episodeKey]?.watched);
    const isFocused = focusEpisode
      && focusEpisode.season === seasonNumber
      && focusEpisode.episode === episode.episode_number;

    return (
      <div style={{ ...style, padding: GAP / 2 }}>
        <EpisodeCard
          episode={episode}
          seasonNumber={seasonNumber}
          seasonLabel={seasonLabel}
          tvShowId={tvShowId}
          isWatched={isWatched}
          isFocused={isFocused}
          onToggle={() => onToggle(seasonNumber, episode.episode_number, !isWatched)}
        />
      </div>
    );
  };

  return (
    <div ref={containerRef} style={{ width: '100%' }}>
      {dimensions.width > 0 && (
        <Grid
          columnCount={dimensions.columnCount}
          columnWidth={(dimensions.width - GAP * (dimensions.columnCount + 1)) / dimensions.columnCount}
          height={Math.min(600, rowCount * (ITEM_HEIGHT + GAP))}
          rowCount={rowCount}
          rowHeight={ITEM_HEIGHT + GAP}
          width={dimensions.width}
        >
          {Cell}
        </Grid>
      )}
    </div>
  );
};

export default function TVShowProgress({
  tvShowId,
  seasons = [],
  seasonDetailsByNumber = {},
  expandedSeasons,
  onToggleSeason,
  focusEpisode,
}) {
  const [internalExpandedSeasons, setInternalExpandedSeasons] = useState([]);
  const { progressByMediaId, markEpisodeWatched, markSeasonWatched } = useWatchProgress();
  const mediaKey = String(tvShowId);
  const expanded = expandedSeasons ?? internalExpandedSeasons;

  const sortedSeasons = useMemo(
    () => [...seasons].sort((a, b) => (a.season_number ?? 0) - (b.season_number ?? 0)),
    [seasons],
  );

  const handleToggle = (seasonNumber) => {
    onToggleSeason?.(seasonNumber);
    if (expandedSeasons !== undefined) return;
    setInternalExpandedSeasons((prev) => (
      prev.includes(seasonNumber)
        ? prev.filter((value) => value !== seasonNumber)
        : [...prev, seasonNumber]
    ));
  };

  const handleEpisodeToggle = (seasonNumber, episodeNumber, watched) => {
    markEpisodeWatched(tvShowId, seasonNumber, episodeNumber, watched).catch(() => {});
  };

  useEffect(() => {
    if (!focusEpisode) return;
    if (!expanded.includes(focusEpisode.season)) return;
    const targetId = `episode-${tvShowId}-${focusEpisode.season}-${focusEpisode.episode}`;
    const raf = requestAnimationFrame(() => {
      const element = document.getElementById(targetId);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    });
    return () => cancelAnimationFrame(raf);
  }, [expanded, focusEpisode, tvShowId]);

  return (
    <div className="space-y-4">
      {sortedSeasons.map((season) => {
        const seasonNumber = season.season_number;
        const seasonKey = String(seasonNumber);
        const seasonProgress = progressByMediaId?.[mediaKey]?.[seasonKey] || {};
        const { episodes, isLoading, error } = resolveSeasonDetails(seasonDetailsByNumber[seasonNumber]);
        const totalEpisodes = episodes.length
          || season.episode_count
          || Object.keys(seasonProgress).length
          || 0;
        const watchedEpisodes = episodes.length > 0
          ? episodes.filter((episode) => (
            seasonProgress?.[String(episode.episode_number)]?.watched
          )).length
          : Object.values(seasonProgress).filter((entry) => entry?.watched).length;
        const isComplete = totalEpisodes > 0 && watchedEpisodes >= totalEpisodes;
        const primaryEpisodeNumbers = episodes.length > 0
          ? episodes.map((episode) => episode.episode_number).filter(Number.isFinite)
          : Object.keys(seasonProgress).map((value) => Number(value)).filter(Number.isFinite);
        const fallbackEpisodeNumbers = totalEpisodes > 0
          ? Array.from({ length: totalEpisodes }, (_, index) => index + 1)
          : [];
        const episodeNumbers = primaryEpisodeNumbers.length > 0
          ? primaryEpisodeNumbers
          : fallbackEpisodeNumbers;
        const canMarkSeason = episodeNumbers.length > 0;
        const seasonLabel = season.name || `Season ${seasonNumber}`;

        return (
          <section
            key={season.id || seasonNumber}
            className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900"
          >
            <div className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-1 items-start gap-3">
                <button
                  type="button"
                  onClick={() => handleToggle(seasonNumber)}
                  className="mt-1 inline-flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 text-gray-600 transition hover:border-gray-300 hover:text-gray-800 dark:border-gray-700 dark:text-gray-300 dark:hover:border-gray-600 dark:hover:text-gray-100"
                  aria-expanded={expanded.includes(seasonNumber)}
                  aria-controls={`season-${seasonNumber}-episodes`}
                >
                  <svg
                    className={`h-4 w-4 transition-transform ${expanded.includes(seasonNumber) ? 'rotate-90' : ''}`}
                    viewBox="0 0 20 20"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    aria-hidden="true"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M7 5l6 5-6 5" />
                  </svg>
                </button>
                <div>
                  <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">
                    {seasonLabel}
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {watchedEpisodes}/{totalEpisodes} watched
                    {season.air_date ? ` • Aired ${formatDate(season.air_date)}` : ''}
                  </p>
                  {totalEpisodes > 0 && (
                    <div className="mt-2 max-w-xs">
                      <ProgressBar
                        current={watchedEpisodes}
                        total={totalEpisodes}
                        label=""
                        size="sm"
                      />
                    </div>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => markSeasonWatched(
                  tvShowId,
                  seasonNumber,
                  !isComplete,
                  episodeNumbers,
                ).catch(() => {})}
                disabled={!canMarkSeason}
                className="inline-flex items-center justify-center rounded-full border border-primary-500 px-4 py-1.5 text-xs font-semibold text-primary-600 transition hover:bg-primary-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-primary-400 dark:text-primary-300 dark:hover:bg-primary-500/10"
              >
                {isComplete ? 'Mark season unwatched' : 'Mark season watched'}
              </button>
            </div>

            {expanded.includes(seasonNumber) && (
              <div id={`season-${seasonNumber}-episodes`} className="border-t border-gray-100 px-4 pb-4 pt-4 dark:border-gray-800">
                {isLoading && (
                  <p className="text-sm text-gray-500 dark:text-gray-400">Loading episodes...</p>
                )}
                {error && (
                  <p className="text-sm text-red-600 dark:text-red-400">Failed to load episodes.</p>
                )}
                {!isLoading && !error && episodes.length === 0 && (
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    No episode details available.
                  </p>
                )}
                {episodes.length > 0 && (
                  episodes.length > 100 ? (
                    <VirtualizedEpisodeGrid
                      episodes={episodes}
                      seasonNumber={seasonNumber}
                      seasonLabel={seasonLabel}
                      tvShowId={tvShowId}
                      seasonProgress={seasonProgress}
                      focusEpisode={focusEpisode}
                      onToggle={handleEpisodeToggle}
                    />
                  ) : (
                    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {episodes.map((episode) => {
                        const episodeKey = String(episode.episode_number);
                        const isWatched = Boolean(seasonProgress?.[episodeKey]?.watched);
                        const isFocused = focusEpisode
                          && focusEpisode.season === seasonNumber
                          && focusEpisode.episode === episode.episode_number;
                        const toggleEpisode = () => handleEpisodeToggle(
                          seasonNumber,
                          episode.episode_number,
                          !isWatched,
                        );

                        return (
                          <EpisodeCard
                            key={episode.id || episode.episode_number}
                            episode={episode}
                            seasonNumber={seasonNumber}
                            seasonLabel={seasonLabel}
                            tvShowId={tvShowId}
                            isWatched={isWatched}
                            isFocused={isFocused}
                            onToggle={toggleEpisode}
                          />
                        );
                      })}
                    </ul>
                  )
                )}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
