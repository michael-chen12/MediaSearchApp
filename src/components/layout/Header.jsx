import { Link, useNavigate } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';
import { useFavorites } from '../../context/FavoritesContext';
import { useWatchlist } from '../../context/WatchlistContext';
import SearchBar from '../common/SearchBar';

export default function Header() {
  const { theme, toggleTheme } = useTheme();
  const { getFavorites } = useFavorites();
  const { getWatchlist } = useWatchlist();
  const navigate = useNavigate();

  const favoritesCount = getFavorites('movie').length + getFavorites('tv').length;
  const watchlistCount = getWatchlist('movie').length + getWatchlist('tv').length;

  const handleSearch = (query) => {
    if (query.trim()) {
      navigate(`/search?q=${encodeURIComponent(query.trim())}`);
    }
  };

  return (
    <header className="sticky top-0 z-50 bg-gradient-to-b from-gray-50 via-white to-gray-100 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 shadow-md">
      <div className="container mx-auto px-6 sm:px-8 lg:px-10 py-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <Link
            to="/"
            className="text-2xl font-bold text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 transition-colors"
            aria-label="Go to homepage"
          >
            🎬 Cinematic
          </Link>

          <div className="flex-1 md:max-w-xl">
            <SearchBar onSearch={handleSearch} />
          </div>

          <div className="flex items-center gap-2">
            <Link
              to="/favorites"
              className="relative p-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-[transform,background-color,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-lg"
              aria-label="View favorites"
            >
              <svg className="w-6 h-6 text-red-500" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
              {favoritesCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                  {favoritesCount}
                </span>
              )}
            </Link>
            
            <Link
              to="/watchlist"
              className="relative p-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-[transform,background-color,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-lg"
              aria-label="View watchlist"
            >
              <svg className="w-6 h-6 text-blue-500" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
              </svg>
              {watchlistCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-blue-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                  {watchlistCount}
                </span>
              )}
            </Link>

            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-[transform,background-color,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-lg"
              aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            >
              {theme === 'dark' ? '☀️' : '🌙'}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
