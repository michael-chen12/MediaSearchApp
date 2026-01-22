import { Link } from 'react-router-dom';
import { getImageUrl } from '../../lib/tmdbClient';
import { formatYear, formatRating } from '../../utils/format';
import NotesTagsPreview from './NotesTagsPreview';
import { normalizeNotes, normalizeTags } from '../../utils/annotations';

export default function MovieCard({
  movie,
  notes,
  tags,
  listId,
  onEditNotesTags,
  annotationsDisabled = false,
}) {
  const posterUrl = getImageUrl(movie.poster_path, 'poster', 'medium');
  const showAnnotations = Boolean(listId);
  const canEdit = Boolean(onEditNotesTags) && !annotationsDisabled;
  const handleEditClick = (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (!canEdit) return;
    onEditNotesTags?.(movie.id);
  };

  const cardContent = (
    <>
      <div className="aspect-[2/3] relative overflow-hidden bg-gray-200 dark:bg-gray-700">
        {posterUrl ? (
          <img
            src={posterUrl}
            alt={`${movie.title} poster`}
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

        {movie.vote_average > 0 && (
          <div className="absolute top-2 right-2 bg-black/80 text-white px-2 py-1 rounded-md text-sm font-semibold flex items-center gap-1">
            <span className="text-yellow-400">⭐</span>
            {formatRating(movie.vote_average)}
          </div>
        )}
      </div>

      <div className={`p-4 card-body${showAnnotations ? ' pb-3' : ''}`}>
        <h3 className="font-semibold text-gray-900 dark:text-gray-100 line-clamp-2 leading-snug min-h-[2.75rem] mb-1">
          {movie.title}
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {formatYear(movie.release_date)}
        </p>
      </div>
    </>
  );

  if (!showAnnotations) {
    return (
      <Link
        to={`/movie/${movie.id}`}
        className="group block rounded-lg bg-gray-100 dark:bg-gray-800 shadow-md card-anim"
        aria-label={`View details for ${movie.title}`}
      >
        {cardContent}
      </Link>
    );
  }

  const normalizedNotes = normalizeNotes(notes);
  const normalizedTags = normalizeTags(tags);
  const hasPreview = normalizedTags.length > 0 || Boolean(normalizedNotes);
  const actionsClassName = hasPreview ? 'mt-2' : 'mt-0';

  return (
    <div className="group rounded-lg bg-gray-100 dark:bg-gray-800 shadow-md card-anim">
      <Link
        to={`/movie/${movie.id}`}
        className="block focus:outline-none"
        aria-label={`View details for ${movie.title}`}
      >
        {cardContent}
      </Link>
      <div className="px-4 pb-4">
        {hasPreview && (
          <div className="mt-2">
            <NotesTagsPreview
              notes={normalizedNotes}
              tags={normalizedTags}
              onClick={handleEditClick}
              disabled={!canEdit}
            />
          </div>
        )}
        <div className={`flex items-center justify-end ${actionsClassName}`}>
          <button
            type="button"
            onClick={handleEditClick}
            disabled={!canEdit}
            className="inline-flex items-center justify-center rounded-full border border-gray-200 bg-white/80 p-2 text-gray-500 transition hover:border-gray-300 hover:text-gray-700 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:bg-gray-900/70 dark:text-gray-400 dark:hover:border-gray-600 dark:hover:text-gray-200"
            aria-label={`Edit notes and tags for ${movie.title}`}
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
