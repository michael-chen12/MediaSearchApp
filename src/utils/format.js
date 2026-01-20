export function formatDate(dateString) {
  if (!dateString) return 'N/A';

  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

export function formatYear(dateString) {
  if (!dateString) return 'N/A';
  return new Date(dateString).getFullYear();
}

export function formatRuntime(minutes) {
  if (!minutes) return 'N/A';

  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}

export function formatCurrency(amount) {
  if (!amount || amount === 0) return 'N/A';

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatRating(rating) {
  if (rating === undefined || rating === null) return 'N/A';
  return rating.toFixed(1);
}

export function formatVoteCount(count) {
  if (!count) return '0';

  if (count >= 1000000) {
    return `${(count / 1000000).toFixed(1)}M`;
  }
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}K`;
  }
  return count.toString();
}

/**
 * Format season/episode as "S01E05"
 */
export function formatEpisode(season, episode) {
  const s = String(season).padStart(2, '0');
  const e = String(episode).padStart(2, '0');
  return `S${s}E${e}`;
}

/**
 * Format air date (alias for formatDate for clarity in TV context)
 */
export function formatAirDate(dateString) {
  return formatDate(dateString);
}
