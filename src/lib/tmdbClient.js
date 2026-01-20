import { http } from './http.js';

/**
 * TMDB Client - calls our Vercel serverless proxy endpoints
 * (NOT TMDB directly, to keep API key secure on server)
 */

const API_BASE = '/api/tmdb';

export const IMAGE_SIZES = {
  poster: {
    small: 'w185',
    medium: 'w342',
    large: 'w500',
    original: 'original',
  },
  backdrop: {
    small: 'w300',
    medium: 'w780',
    large: 'w1280',
    original: 'original',
  },
  profile: {
    small: 'w185',
    medium: 'h632',
    original: 'original',
  },
};

const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p';

/**
 * Get full image URL for TMDB images
 */
export function getImageUrl(path, type = 'poster', size = 'medium') {
  if (!path) return null;
  const sizeValue = IMAGE_SIZES[type]?.[size] || IMAGE_SIZES.poster.medium;
  return `${TMDB_IMAGE_BASE_URL}/${sizeValue}${path}`;
}

/**
 * Search movies by query
 */
export async function searchMovies(query, page = 1) {
  const params = new URLSearchParams({ q: query, page: String(page) });
  return http(`${API_BASE}/search?${params}`);
}

/**
 * Get movie details by ID
 */
export async function getMovieDetails(movieId) {
  return http(`${API_BASE}/movie?id=${movieId}`);
}

/**
 * Get trending movies
 */
export async function getTrendingMovies(timeWindow = 'week', page = 1) {
  const params = new URLSearchParams({
    timeWindow,
    page: String(page)
  });
  return http(`${API_BASE}/trending?${params}`);
}

/**
 * Get movie credits (cast & crew)
 */
export async function getMovieCredits(movieId) {
  return http(`${API_BASE}/credits?id=${movieId}`);
}

/**
 * Get similar movies
 */
export async function getSimilarMovies(movieId, page = 1) {
  const params = new URLSearchParams({
    id: String(movieId),
    page: String(page)
  });
  return http(`${API_BASE}/similar?${params}`);
}

/**
 * Search TV shows by query
 */
export async function searchTVShows(query, page = 1) {
  const params = new URLSearchParams({ q: query, page: String(page) });
  return http(`${API_BASE}/tv-search?${params}`);
}

/**
 * Get TV show details by ID
 */
export async function getTVShowDetails(tvId) {
  return http(`${API_BASE}/tv-details?id=${tvId}`);
}

/**
 * Get trending TV shows
 */
export async function getTrendingTVShows(timeWindow = 'week', page = 1) {
  const params = new URLSearchParams({ timeWindow, page: String(page) });
  return http(`${API_BASE}/tv-trending?${params}`);
}

/**
 * Get TV show credits (cast & crew)
 */
export async function getTVShowCredits(tvId) {
  return http(`${API_BASE}/tv-credits?id=${tvId}`);
}

/**
 * Get similar TV shows
 */
export async function getSimilarTVShows(tvId, page = 1) {
  const params = new URLSearchParams({ id: String(tvId), page: String(page) });
  return http(`${API_BASE}/tv-similar?${params}`);
}

/**
 * Get TV season details with episodes
 */
export async function getTVSeasonDetails(tvId, seasonNumber) {
  const params = new URLSearchParams({
    id: String(tvId),
    seasonNumber: String(seasonNumber)
  });
  return http(`${API_BASE}/tv-season?${params}`);
}

/**
 * Search people by query
 */
export async function searchPeople(query, page = 1) {
  const params = new URLSearchParams({ q: query, page: String(page) });
  return http(`${API_BASE}/person-search?${params}`);
}

/**
 * Get person details by ID
 */
export async function getPersonDetails(personId) {
  return http(`${API_BASE}/person-details?id=${personId}`);
}

/**
 * Get person credits (combined movies + TV shows)
 */
export async function getPersonCredits(personId) {
  return http(`${API_BASE}/person-credits?id=${personId}`);
}

/**
 * Get trending people
 */
export async function getTrendingPeople(timeWindow = 'week', page = 1) {
  const params = new URLSearchParams({ timeWindow, page: String(page) });
  return http(`${API_BASE}/person-trending?${params}`);
}

/**
 * Get collection details by ID
 */
export async function getCollectionDetails(collectionId) {
  return http(`${API_BASE}/collection?id=${collectionId}`);
}
