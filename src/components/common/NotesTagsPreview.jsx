import { normalizeNotes, normalizeTags } from '../../utils/annotations';

const TAG_PREVIEW_COUNT = 2;
const NOTES_PREVIEW_LENGTH = 60;

const buildNotesPreview = (notes) => {
  if (!notes) return '';
  if (notes.length <= NOTES_PREVIEW_LENGTH) return notes;
  return `${notes.slice(0, NOTES_PREVIEW_LENGTH)}...`;
};

export default function NotesTagsPreview({ notes, tags, onClick, disabled = false }) {
  const normalizedNotes = normalizeNotes(notes).replace(/\s+/g, ' ');
  const normalizedTags = normalizeTags(tags);
  const visibleTags = normalizedTags.slice(0, TAG_PREVIEW_COUNT);
  const extraCount = Math.max(0, normalizedTags.length - visibleTags.length);
  const notesPreview = buildNotesPreview(normalizedNotes);
  const hasContent = normalizedTags.length > 0 || Boolean(notesPreview);
  const isDisabled = disabled || !onClick;

  if (!hasContent) return null;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isDisabled}
      aria-disabled={isDisabled}
      className="flex h-full max-h-[4.5rem] w-full flex-col gap-1 overflow-hidden rounded-lg border border-gray-200/80 bg-white/70 px-3 py-2 text-left text-xs text-gray-600 transition hover:border-gray-300 hover:bg-white disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-800/80 dark:bg-gray-900/60 dark:text-gray-300 dark:hover:border-gray-700"
    >
      {visibleTags.length > 0 && (
        <div className="flex flex-wrap items-center gap-1">
          {visibleTags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center rounded-full bg-primary-100 px-2 py-0.5 text-[11px] font-semibold text-primary-700 dark:bg-primary-900/40 dark:text-primary-200"
            >
              {tag}
            </span>
          ))}
          {extraCount > 0 && (
            <span className="inline-flex items-center rounded-full border border-gray-200 px-2 py-0.5 text-[11px] font-semibold text-gray-500 dark:border-gray-700 dark:text-gray-300">
              +{extraCount} more
            </span>
          )}
        </div>
      )}
      {notesPreview && (
        <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
          <svg
            className="h-3.5 w-3.5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M8 7h8M8 12h8M8 17h5" />
            <path d="M5 4h14a1 1 0 0 1 1 1v14l-3-2-3 2-3-2-3 2-3-2V5a1 1 0 0 1 1-1z" />
          </svg>
          <span className="line-clamp-1">{notesPreview}</span>
        </div>
      )}
    </button>
  );
}
