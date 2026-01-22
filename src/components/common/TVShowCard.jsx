import { Link } from 'react-router-dom';
import { getImageUrl } from '../../lib/tmdbClient';
import { formatYear, formatRating } from '../../utils/format';
import NotesTagsPreview from './NotesTagsPreview';
import { normalizeNotes, normalizeTags } from '../../utils/annotations';
import ProgressBar from './ProgressBar';
import { useWatchProgress } from '../../context/WatchProgressContext';

export default function TVShowCard({
  tvShow,
  notes,
  tags,
  listId,
  showProgress = false,
  onMarkWatched,
  markWatchedDisabled = false,
  onEditNotesTags,
  annotationsDisabled = false,
}) {
  const { getProgress } = useWatchProgress();
  const posterUrl = getImageUrl(tvShow.poster_path, 'poster', 'medium');
  const showAnnotations = Boolean(listId);
  const canEdit = Boolean(onEditNotesTags) && !annotationsDisabled;
  const canMarkWatched = Boolean(onMarkWatched) && !annotationsDisabled;
  const progress = showProgress ? getProgress(tvShow.id) : null;
  const totalFromSeasons = Array.isArray(tvShow?.seasons)
    ? tvShow.seasons.reduce((sum, season) => {
        const count = Number(season?.episode_count);
        return Number.isFinite(count) ? sum + count : sum;
      }, 0)
    : 0;
  const totalEpisodes = Number.isFinite(tvShow?.number_of_episodes)
    ? tvShow.number_of_episodes
    : totalFromSeasons;
  const watchedEpisodes = progress?.watchedEpisodes || 0;
  const hasTotal = totalEpisodes > 0;
  const progressPercentage = hasTotal
    ? Math.min(100, Math.round((watchedEpisodes / totalEpisodes) * 100))
    : 0;
  const progressLabel = hasTotal
    ? `${watchedEpisodes}/${totalEpisodes} episodes watched (${progressPercentage}%)`
    : watchedEpisodes > 0
      ? `${watchedEpisodes} episode${watchedEpisodes === 1 ? '' : 's'} watched`
      : 'Progress unavailable';
  const handleEditClick = (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (!canEdit) return;
    onEditNotesTags?.(tvShow.id);
  };

  const handleMarkWatchedClick = (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (!canMarkWatched || markWatchedDisabled) return;
    onMarkWatched?.();
  };

  const cardContent = (
    <>
      <div className="aspect-[2/3] relative overflow-hidden bg-gray-200 dark:bg-gray-700">
        {posterUrl ? (
          <img
            src={posterUrl}
            alt={`${tvShow.name} poster`}
            className="w-full h-full object-cover card-image"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400 dark:text-gray-600">
            <svg
              className="w-16 h-16"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z"
              />
            </svg>
          </div>
        )}

        {tvShow.vote_average > 0 && (
          <div className="absolute top-2 right-2 bg-black/80 text-white px-2 py-1 rounded-md text-sm font-semibold flex items-center gap-1">
            <span className="text-yellow-400">⭐</span>
            {formatRating(tvShow.vote_average)}
          </div>
        )}
      </div>

      <div className={`p-4 card-body${showAnnotations ? ' pb-3' : ''}`}>
        <h3 className="font-semibold text-gray-900 dark:text-gray-100 line-clamp-2 leading-snug min-h-[2.75rem] mb-1">
          {tvShow.name}
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {formatYear(tvShow.first_air_date)}
        </p>
        {showProgress && (
          <div className="mt-3">
            {hasTotal ? (
              <ProgressBar
                current={watchedEpisodes}
                total={totalEpisodes}
                label={progressLabel}
                size="sm"
              />
            ) : (
              <div className="text-xs text-gray-600 dark:text-gray-400">
                {progressLabel}
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );

  if (!showAnnotations) {
    return (
      <Link
        to={`/tv/${tvShow.id}`}
        className="group block rounded-lg bg-gray-100 dark:bg-gray-800 shadow-md card-anim"
        aria-label={`View details for ${tvShow.name}`}
      >
        {cardContent}
      </Link>
    );
  }

  const normalizedNotes = normalizeNotes(notes);
  const normalizedTags = normalizeTags(tags);
  const hasPreview = normalizedTags.length > 0 || Boolean(normalizedNotes);
  const markWatchedTitle = markWatchedDisabled ? 'Updating progress...' : 'Mark next episode watched';

  return (
    <div className="group rounded-lg bg-gray-100 dark:bg-gray-800 shadow-md card-anim">
      <Link
        to={`/tv/${tvShow.id}`}
        className="block focus:outline-none"
        aria-label={`View details for ${tvShow.name}`}
      >
        {cardContent}
      </Link>
      <div className="px-4 pb-4">
        <div className="mt-2 h-[4.5rem]">
          {hasPreview ? (
            <NotesTagsPreview
              notes={normalizedNotes}
              tags={normalizedTags}
              onClick={handleEditClick}
              disabled={!canEdit}
            />
          ) : null}
        </div>
        <div className="flex items-center justify-end gap-2 mt-2">
          {onMarkWatched && (
            <button
              type="button"
              onClick={handleMarkWatchedClick}
              disabled={!canMarkWatched || markWatchedDisabled}
              className="inline-flex items-center justify-center rounded-full border border-emerald-200 bg-emerald-50/80 p-2 text-emerald-600 transition hover:border-emerald-300 hover:text-emerald-700 disabled:cursor-not-allowed disabled:opacity-60 dark:border-emerald-700/70 dark:bg-emerald-900/30 dark:text-emerald-300 dark:hover:border-emerald-500 dark:hover:text-emerald-200"
              aria-label={`Mark next episode watched for ${tvShow.name}`}
              title={markWatchedTitle}
            >
              <svg
                className="h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M5 13l4 4L19 7" />
              </svg>
            </button>
          )}
          <button
            type="button"
            onClick={handleEditClick}
            disabled={!canEdit}
            className="inline-flex items-center justify-center rounded-full border border-gray-200 bg-white/80 p-2 text-gray-500 transition hover:border-gray-300 hover:text-gray-700 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:bg-gray-900/70 dark:text-gray-400 dark:hover:border-gray-600 dark:hover:text-gray-200"
            aria-label={`Edit notes and tags for ${tvShow.name}`}
          >
            <svg
              className="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
