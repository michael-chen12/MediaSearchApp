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
  const params = new URLSearchParams({ 
    endpoint: 'search/movie',
    query,
    page: String(page),
    include_adult: 'false'
  });
  return http(`${API_BASE}?${params}`);
}

/**
 * Get movie details by ID
 */
export async function getMovieDetails(movieId) {
  const params = new URLSearchParams({ 
    endpoint: `movie/${movieId}`,
    append_to_response: 'credits,similar'
  });
  return http(`${API_BASE}?${params}`);
}

/**
 * Get trending movies
 */
export async function getTrendingMovies(timeWindow = 'week', page = 1) {
  const params = new URLSearchParams({
    endpoint: `trending/movie/${timeWindow}`,
    page: String(page)
  });
  return http(`${API_BASE}?${params}`);
}

/**
 * Get movie credits (cast & crew)
 */
export async function getMovieCredits(movieId) {
  const params = new URLSearchParams({ 
    endpoint: `movie/${movieId}/credits`
  });
  return http(`${API_BASE}?${params}`);
}

/**
 * Get similar movies
 */
export async function getSimilarMovies(movieId, page = 1) {
  const params = new URLSearchParams({
    endpoint: `movie/${movieId}/similar`,
    page: String(page)
  });
  return http(`${API_BASE}?${params}`);
}

/**
 * Search TV shows by query
 */
export async function searchTVShows(query, page = 1) {
  const params = new URLSearchParams({ 
    endpoint: 'search/tv',
    query,
    page: String(page),
    include_adult: 'false'
  });
  return http(`${API_BASE}?${params}`);
}

/**
 * Get TV show details by ID
 */
export async function getTVShowDetails(tvId) {
  const params = new URLSearchParams({ 
    endpoint: `tv/${tvId}`,
    append_to_response: 'credits,similar'
  });
  return http(`${API_BASE}?${params}`);
}

/**
 * Get trending TV shows
 */
export async function getTrendingTVShows(timeWindow = 'week', page = 1) {
  const params = new URLSearchParams({ 
    endpoint: `trending/tv/${timeWindow}`,
    page: String(page) 
  });
  return http(`${API_BASE}?${params}`);
}

/**
 * Get TV show credits (cast & crew)
 */
export async function getTVShowCredits(tvId) {
  const params = new URLSearchParams({ 
    endpoint: `tv/${tvId}/credits`
  });
  return http(`${API_BASE}?${params}`);
}

/**
 * Get similar TV shows
 */
export async function getSimilarTVShows(tvId, page = 1) {
  const params = new URLSearchParams({ 
    endpoint: `tv/${tvId}/similar`,
    page: String(page) 
  });
  return http(`${API_BASE}?${params}`);
}

/**
 * Get TV season details with episodes
 */
export async function getTVSeasonDetails(tvId, seasonNumber) {
  const params = new URLSearchParams({
    endpoint: `tv/${tvId}/season/${seasonNumber}`
  });
  return http(`${API_BASE}?${params}`);
}

/**
 * Search people by query
 */
export async function searchPeople(query, page = 1) {
  const params = new URLSearchParams({ 
    endpoint: 'search/person',
    query,
    page: String(page),
    include_adult: 'false'
  });
  return http(`${API_BASE}?${params}`);
}

/**
 * Get person details by ID
 */
export async function getPersonDetails(personId) {
  const params = new URLSearchParams({ 
    endpoint: `person/${personId}`
  });
  return http(`${API_BASE}?${params}`);
}

/**
 * Get person credits (combined movies + TV shows)
 */
export async function getPersonCredits(personId) {
  const params = new URLSearchParams({ 
    endpoint: `person/${personId}/combined_credits`
  });
  return http(`${API_BASE}?${params}`);
}

/**
 * Get trending people
 */
export async function getTrendingPeople(timeWindow = 'week', page = 1) {
  const params = new URLSearchParams({ 
    endpoint: `trending/person/${timeWindow}`,
    page: String(page) 
  });
  return http(`${API_BASE}?${params}`);
}

/**
 * Get collection details by ID
 */
export async function getCollectionDetails(collectionId) {
  const params = new URLSearchParams({ 
    endpoint: `collection/${collectionId}`
  });
  return http(`${API_BASE}?${params}`);
}
