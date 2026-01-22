import { useEffect, useRef, useState } from 'react';
import Modal from './Modal';
import Button from '../base/Button';
import { normalizeNotes, normalizeTags, tagsEqual } from '../../utils/annotations';

const TAG_LIMIT = 10;
const TAG_MAX_LENGTH = 30;
const NOTES_MAX_LENGTH = 500;
const TAG_SPLIT_REGEX = /[,\n]+/;

const normalizeTagValue = (value) => value.trim().replace(/\s+/g, ' ');

const buildTagsFromInput = (currentTags, value) => {
  const tokens = value
    .split(TAG_SPLIT_REGEX)
    .map((token) => normalizeTagValue(token))
    .filter(Boolean);

  if (tokens.length === 0) {
    return { nextTags: currentTags, errorMessage: '' };
  }

  let nextTags = [...currentTags];
  let errorMessage = '';

  tokens.forEach((token) => {
    if (nextTags.length >= TAG_LIMIT) {
      errorMessage = `Up to ${TAG_LIMIT} tags allowed.`;
      return;
    }
    if (token.length > TAG_MAX_LENGTH) {
      errorMessage = `Tags must be ${TAG_MAX_LENGTH} characters or fewer.`;
      return;
    }
    const key = token.toLowerCase();
    if (nextTags.some((tag) => tag.toLowerCase() === key)) return;
    nextTags.push(token);
  });

  return { nextTags, errorMessage };
};

export default function NotesTagsModal({
  open,
  itemTitle,
  initialNotes = '',
  initialTags = [],
  onSave,
  onClose,
  helperText = '',
}) {
  const [notes, setNotes] = useState('');
  const [tags, setTags] = useState([]);
  const [tagInput, setTagInput] = useState('');
  const [tagInputError, setTagInputError] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const initialRef = useRef({ notes: '', tags: [] });

  useEffect(() => {
    if (!open) return;
    const normalizedNotes = normalizeNotes(initialNotes);
    const normalizedTags = normalizeTags(initialTags);
    initialRef.current = {
      notes: normalizedNotes,
      tags: normalizedTags,
    };
    setNotes(normalizedNotes);
    setTags(normalizedTags);
    setTagInput('');
    setTagInputError('');
    setErrorMessage('');
    setIsSaving(false);
  }, [open, initialNotes, initialTags]);

  const tagLimitReached = tags.length >= TAG_LIMIT;
  const notesRemaining = Math.max(0, NOTES_MAX_LENGTH - notes.length);
  const notesChanged = normalizeNotes(notes) !== initialRef.current.notes;
  const tagsChanged = !tagsEqual(tags, initialRef.current.tags);
  const hasChanges = notesChanged || tagsChanged;
  const hasTagInputError = Boolean(tagInputError);

  const handleClose = () => {
    if (hasChanges) {
      const confirmClose = window.confirm('Discard unsaved notes and tags?');
      if (!confirmClose) return;
    }
    onClose?.();
  };

  const commitTagInput = (value) => {
    const { nextTags, errorMessage } = buildTagsFromInput(tags, value);
    if (!tagsEqual(nextTags, tags)) {
      setTags(nextTags);
    }
    setTagInputError(errorMessage);
  };

  const handleTagInputKeyDown = (event) => {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault();
      commitTagInput(tagInput);
      setTagInput('');
      return;
    }
    if (event.key === 'Backspace' && !tagInput && tags.length > 0) {
      event.preventDefault();
      setTags(tags.slice(0, -1));
      setTagInputError('');
    }
  };

  const removeTagAtIndex = (index) => {
    setTags(tags.filter((_, idx) => idx !== index));
    setTagInputError('');
  };

  const handleSave = async () => {
    if (isSaving) return;
    let nextTags = tags;
    if (tagInput.trim()) {
      const { nextTags: updatedTags, errorMessage } = buildTagsFromInput(tags, tagInput);
      nextTags = updatedTags;
      setTags(updatedTags);
      setTagInput('');
      setTagInputError(errorMessage);
      if (errorMessage) return;
    }
    setIsSaving(true);
    setErrorMessage('');
    const notesValue = normalizeNotes(notes);
    const tagsValue = normalizeTags(nextTags);
    try {
      await onSave?.({ notes: notesValue, tags: tagsValue });
      onClose?.();
    } catch (error) {
      setErrorMessage(error?.message || 'Unable to save notes and tags.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleKeyDown = (event) => {
    if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
      event.preventDefault();
      if (isSaving || hasTagInputError || !hasChanges) return;
      handleSave();
    }
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={`Notes & tags for ${itemTitle || 'item'}`}
      containerClassName="items-end sm:items-center"
      panelClassName="max-h-[90vh] overflow-hidden rounded-b-none sm:rounded-b-2xl"
      bodyClassName="max-h-[60vh] overflow-y-auto"
      footer={(
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-xs text-gray-500 dark:text-gray-400">
            {helperText}
          </div>
          <div className="flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleClose}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={handleSave}
              disabled={isSaving || hasTagInputError || !hasChanges}
            >
              {isSaving && (
                <svg
                  className="mr-2 h-4 w-4 animate-spin"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M12 3a9 9 0 1 0 9 9" />
                </svg>
              )}
              {isSaving ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </div>
      )}
    >
      <div className="space-y-6" onKeyDown={handleKeyDown}>
        <div>
          <div className="flex items-center justify-between">
            <label htmlFor="annotation-tags" className="text-sm font-semibold text-gray-700 dark:text-gray-200">
              Tags
            </label>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {tags.length}/{TAG_LIMIT}
            </span>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {tags.length === 0 ? (
              <span className="text-xs text-gray-500 dark:text-gray-400">No tags yet.</span>
            ) : (
              tags.map((tag, index) => (
                <span
                  key={`${tag}-${index}`}
                  className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-white px-2 py-1 text-xs font-semibold text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
                >
                  {tag}
                  <button
                    type="button"
                    className="text-gray-400 hover:text-gray-600 disabled:cursor-not-allowed disabled:opacity-60 dark:text-gray-500 dark:hover:text-gray-300"
                    onClick={() => removeTagAtIndex(index)}
                    disabled={isSaving}
                    aria-label={`Remove tag ${tag}`}
                  >
                    x
                  </button>
                </span>
              ))
            )}
          </div>
          <input
            id="annotation-tags"
            type="text"
            value={tagInput}
            onChange={(event) => {
              setTagInput(event.target.value);
              if (tagInputError) {
                setTagInputError('');
              }
            }}
            onKeyDown={handleTagInputKeyDown}
            onBlur={() => {
              if (!tagInput.trim()) return;
              commitTagInput(tagInput);
              setTagInput('');
            }}
            placeholder={tagLimitReached ? 'Tag limit reached' : 'Add tags (press Enter or comma)'}
            disabled={tagLimitReached || isSaving}
            className="mt-3 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
          />
          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            Max {TAG_MAX_LENGTH} characters per tag. Use commas to add multiple.
          </p>
          {tagInputError && (
            <p className="mt-2 text-xs text-red-500 dark:text-red-400">
              {tagInputError}
            </p>
          )}
        </div>

        <div>
          <div className="flex items-center justify-between">
            <label htmlFor="annotation-notes" className="text-sm font-semibold text-gray-700 dark:text-gray-200">
              Notes
            </label>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {notes.length}/{NOTES_MAX_LENGTH}
            </span>
          </div>
          <textarea
            id="annotation-notes"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Add a quick note about why you saved this."
            maxLength={NOTES_MAX_LENGTH}
            rows={5}
            disabled={isSaving}
            className="mt-2 w-full resize-none rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
          />
          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            {notesRemaining} characters remaining.
          </p>
        </div>

        {errorMessage && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600 dark:border-red-900/60 dark:bg-red-900/20 dark:text-red-300">
            {errorMessage}
          </div>
        )}
      </div>
    </Modal>
  );
}
