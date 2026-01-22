import { useEffect, useMemo, useState } from 'react';
import Modal from './Modal';
import Button from '../base/Button';
import { normalizeTags } from '../../utils/annotations';

const TAG_LIMIT = 10;
const TAG_MAX_LENGTH = 30;
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

export default function BulkTagsModal({
  open,
  selectedCount = 0,
  existingTags = [],
  tagSuggestions = [],
  onSave,
  onClose,
}) {
  const [addTags, setAddTags] = useState([]);
  const [removeTags, setRemoveTags] = useState([]);
  const [tagInput, setTagInput] = useState('');
  const [tagInputError, setTagInputError] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setAddTags([]);
    setRemoveTags([]);
    setTagInput('');
    setTagInputError('');
    setErrorMessage('');
    setIsSaving(false);
  }, [open]);

  const tagLimitReached = addTags.length >= TAG_LIMIT;
  const hasChanges = addTags.length > 0 || removeTags.length > 0;
  const filteredSuggestions = useMemo(() => {
    if (!tagSuggestions.length) return [];
    const input = tagInput.trim().toLowerCase();
    const selected = new Set(addTags.map((tag) => tag.toLowerCase()));
    return tagSuggestions
      .filter((tag) => !selected.has(tag.toLowerCase()))
      .filter((tag) => (input ? tag.toLowerCase().includes(input) : true))
      .slice(0, 8);
  }, [addTags, tagInput, tagSuggestions]);

  const handleClose = () => {
    if (hasChanges) {
      const confirmClose = window.confirm('Discard unsaved tag changes?');
      if (!confirmClose) return;
    }
    onClose?.();
  };

  const commitTagInput = (value) => {
    const { nextTags, errorMessage: message } = buildTagsFromInput(addTags, value);
    setAddTags(nextTags);
    setTagInputError(message);
  };

  const handleTagInputKeyDown = (event) => {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault();
      commitTagInput(tagInput);
      setTagInput('');
      return;
    }
    if (event.key === 'Backspace' && !tagInput && addTags.length > 0) {
      event.preventDefault();
      setAddTags(addTags.slice(0, -1));
      setTagInputError('');
    }
  };

  const removeAddTagAtIndex = (index) => {
    setAddTags(addTags.filter((_, idx) => idx !== index));
    setTagInputError('');
  };

  const toggleRemoveTag = (tag) => {
    setRemoveTags((prev) => (
      prev.includes(tag)
        ? prev.filter((value) => value !== tag)
        : [...prev, tag]
    ));
  };

  const handleSuggestionClick = (tag) => {
    const { nextTags, errorMessage: message } = buildTagsFromInput(addTags, tag);
    setAddTags(nextTags);
    setTagInput('');
    setTagInputError(message);
  };

  const handleSave = async () => {
    if (!hasChanges || isSaving) return;
    let nextAddTags = addTags;
    if (tagInput.trim()) {
      const { nextTags, errorMessage: message } = buildTagsFromInput(addTags, tagInput);
      nextAddTags = nextTags;
      setAddTags(nextTags);
      setTagInput('');
      setTagInputError(message);
      if (message) return;
    }
    setIsSaving(true);
    setErrorMessage('');
    try {
      await onSave?.({ addTags: normalizeTags(nextAddTags), removeTags: normalizeTags(removeTags) });
      onClose?.();
    } catch (error) {
      setErrorMessage(error?.message || 'Unable to update tags.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={`Edit tags for ${selectedCount} item${selectedCount === 1 ? '' : 's'}`}
      containerClassName="items-end sm:items-center"
      panelClassName="max-h-[90vh] overflow-hidden rounded-b-none sm:rounded-b-2xl"
      bodyClassName="max-h-[60vh] overflow-y-auto"
      footer={(
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
            disabled={!hasChanges || isSaving || Boolean(tagInputError)}
          >
            {isSaving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      )}
    >
      <div className="space-y-6">
        <div>
          <div className="flex items-center justify-between">
            <label htmlFor="bulk-add-tags" className="text-sm font-semibold text-gray-700 dark:text-gray-200">
              Add tags
            </label>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {addTags.length}/{TAG_LIMIT}
            </span>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {addTags.length === 0 ? (
              <span className="text-xs text-gray-500 dark:text-gray-400">No tags yet.</span>
            ) : (
              addTags.map((tag, index) => (
                <span
                  key={`${tag}-${index}`}
                  className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-white px-2 py-1 text-xs font-semibold text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
                >
                  {tag}
                  <button
                    type="button"
                    className="text-gray-400 hover:text-gray-600 disabled:cursor-not-allowed disabled:opacity-60 dark:text-gray-500 dark:hover:text-gray-300"
                    onClick={() => removeAddTagAtIndex(index)}
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
            id="bulk-add-tags"
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
          {filteredSuggestions.length > 0 && (
            <div className="mt-3">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Suggestions
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {filteredSuggestions.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => handleSuggestionClick(tag)}
                    disabled={isSaving || tagLimitReached}
                    className="inline-flex items-center rounded-full border border-gray-200 bg-white px-2 py-1 text-xs font-semibold text-gray-700 transition hover:border-gray-300 hover:text-gray-900 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:border-gray-600"
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">Remove tags</span>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {removeTags.length} selected
            </span>
          </div>
          <div className="mt-2 max-h-40 overflow-y-auto pr-1 space-y-2">
            {existingTags.length === 0 ? (
              <span className="text-xs text-gray-500 dark:text-gray-400">
                No tags on selected items.
              </span>
            ) : (
              existingTags.map((tag) => (
                <label
                  key={tag}
                  className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200"
                >
                  <input
                    type="checkbox"
                    checked={removeTags.includes(tag)}
                    onChange={() => toggleRemoveTag(tag)}
                    className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span>{tag}</span>
                </label>
              ))
            )}
          </div>
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
