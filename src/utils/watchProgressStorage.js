const WATCH_PROGRESS_STORAGE_KEY = 'cinematic_watch_progress';

const safeParse = (value, fallback) => {
  try {
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
};

const normalizeProgress = (value) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return value;
};

export const readWatchProgress = () => {
  const stored = safeParse(localStorage.getItem(WATCH_PROGRESS_STORAGE_KEY), {});
  return normalizeProgress(stored);
};

export const writeWatchProgress = (progress) => {
  const normalized = normalizeProgress(progress);
  localStorage.setItem(WATCH_PROGRESS_STORAGE_KEY, JSON.stringify(normalized));
};

export const clearWatchProgress = () => {
  localStorage.removeItem(WATCH_PROGRESS_STORAGE_KEY);
};

export { WATCH_PROGRESS_STORAGE_KEY };
