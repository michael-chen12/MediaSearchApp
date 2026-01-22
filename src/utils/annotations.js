export const normalizeNotes = (value) => {
  if (typeof value !== 'string') return '';
  return value.trim();
};

export const normalizeTags = (value) => {
  if (!value) return [];
  const rawList = Array.isArray(value)
    ? value
    : typeof value === 'string'
      ? value.split(',')
      : [];

  const tags = [];
  const seen = new Set();

  rawList.forEach((raw) => {
    if (typeof raw !== 'string') return;
    const cleaned = raw.trim().replace(/\s+/g, ' ');
    if (!cleaned) return;
    const key = cleaned.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    tags.push(cleaned);
  });

  return tags;
};

export const tagsEqual = (left, right) => {
  const a = normalizeTags(left).map((tag) => tag.toLowerCase()).sort();
  const b = normalizeTags(right).map((tag) => tag.toLowerCase()).sort();
  if (a.length !== b.length) return false;
  return a.every((tag, index) => tag === b[index]);
};

export const formatNotesPreview = (value) => {
  const notes = normalizeNotes(value);
  return notes.replace(/\s+/g, ' ');
};
