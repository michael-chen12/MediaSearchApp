const TMDB_API_KEY = import.meta.env.VITE_TMDB_API_KEY;
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p';

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

async function fetchFromTMDB(endpoint, params = {}) {
  const url = new URL(`${TMDB_BASE_URL}${endpoint}`);
  url.searchParams.append('api_key', TMDB_API_KEY);

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.append(key, value);
    }
  });

  const response = await fetch(url.toString());

  if (!response.ok) {
    const error = new Error('TMDB API request failed');
    error.status = response.status;
    error.statusText = response.statusText;
    throw error;
  }

  return response.json();
}

export function getImageUrl(path, type = 'poster', size = 'medium') {
  if (!path) return null;
  const sizeValue = IMAGE_SIZES[type]?.[size] || IMAGE_SIZES.poster.medium;
  return `${TMDB_IMAGE_BASE_URL}/${sizeValue}${path}`;
}

export async function getTrendingMovies(timeWindow = 'week', page = 1) {
  return fetchFromTMDB(`/trending/movie/${timeWindow}`, { page });
}

export async function searchMovies(query, page = 1) {
  return fetchFromTMDB('/search/movie', {
    query,
    page,
    include_adult: false
  });
}

export async function getMovieDetails(movieId) {
  return fetchFromTMDB(`/movie/${movieId}`);
}

export async function getMovieCredits(movieId) {
  return fetchFromTMDB(`/movie/${movieId}/credits`);
}

export async function getSimilarMovies(movieId, page = 1) {
  return fetchFromTMDB(`/movie/${movieId}/similar`, { page });
}

export async function getGenres() {
  return fetchFromTMDB('/genre/movie/list');
}

export async function discoverMovies(params = {}) {
  return fetchFromTMDB('/discover/movie', {
    sort_by: 'popularity.desc',
    include_adult: false,
    ...params,
  });
}
