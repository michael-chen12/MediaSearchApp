import { Link, useNavigate } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { useLists } from '../../context/ListsContext';
import SearchBar from '../common/SearchBar';

export default function Header() {
  const { theme, toggleTheme } = useTheme();
  const { user, profile, signOut, isConfigured } = useAuth();
  const { getSystemListItems, clearSystemListItems } = useLists();
  const navigate = useNavigate();

  const watchlistCount = getSystemListItems('watchlist', 'movie').length
    + getSystemListItems('watchlist', 'tv').length;
  const displayName = profile?.display_name?.trim() || user?.email || '';
  const avatarUrl = profile?.avatar_url || '';
  const avatarUrlWithCache = avatarUrl
    ? `${avatarUrl}${avatarUrl.includes('?') ? '&' : '?'}t=${profile?.updated_at || Date.now()}`
    : '';

  const handleSearch = (query) => {
    if (query.trim()) {
      navigate(`/search?q=${encodeURIComponent(query.trim())}`);
    }
  };

  const handleThemeToggle = (event) => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      toggleTheme();
      return;
    }

    const root = document.documentElement;
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    const rect = event.currentTarget.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    const maxRadius = Math.hypot(window.innerWidth, window.innerHeight);

    root.style.setProperty('--theme-transition-x', `${x}px`);
    root.style.setProperty('--theme-transition-y', `${y}px`);
    root.style.setProperty('--theme-transition-size', `${maxRadius * 2}px`);
    root.style.setProperty('--theme-transition-color', nextTheme === 'dark' ? '#0b0c0e' : '#f7f7f8');
    root.classList.add('theme-transitioning');

    toggleTheme();

    window.setTimeout(() => {
      root.classList.remove('theme-transitioning');
    }, 650);
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      clearSystemListItems('watchlist');
    } catch (error) {
      // Keep logout resilient even if Supabase has transient issues.
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
            🎬 ReelRadar
          </Link>

          <div className="flex-1 md:max-w-xl">
            <SearchBar onSearch={handleSearch} />
          </div>

          <div className="flex items-center gap-2">
            {user && (
              <>
                <Link
                  to="/watchlist"
                  className={`list-toggle list-toggle--watchlist ${theme === 'dark' ? 'list-toggle--dark' : ''}`}
                  aria-label="View watchlist"
                >
                  <span className="list-toggle__icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                    </svg>
                  </span>
                  {watchlistCount > 0 && (
                    <span className="list-toggle__badge">
                      {watchlistCount}
                    </span>
                  )}
                </Link>
              </>
            )}

            <button
              onClick={handleThemeToggle}
              className={`theme-toggle ${theme === 'dark' ? 'theme-toggle--dark' : 'theme-toggle--light'}`}
              aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
              aria-pressed={theme === 'dark'}
            >
              <span className="theme-toggle__icon theme-toggle__icon--sun" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="4" />
                  <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
                </svg>
              </span>
              <span className="theme-toggle__icon theme-toggle__icon--moon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 12.79A9 9 0 0111.21 3a7.5 7.5 0 109.79 9.79z" />
                </svg>
              </span>
            </button>

            <div className="flex items-center gap-2 ml-2">
              {!isConfigured ? (
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  Auth not configured
                </span>
              ) : user ? (
                <>
                  <Link
                    to="/profile"
                    className="flex items-center gap-2 text-xs text-gray-700 dark:text-gray-200 hover:text-primary-600 dark:hover:text-primary-400 transition-colors max-w-[160px]"
                  >
                    {avatarUrlWithCache ? (
                      <img
                        src={avatarUrlWithCache}
                        alt="Profile avatar"
                        className="h-7 w-7 rounded-full object-cover border border-gray-200 dark:border-gray-700"
                      />
                    ) : (
                      <span className="h-7 w-7 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 flex items-center justify-center text-xs font-semibold">
                        {(displayName || 'U').slice(0, 1).toUpperCase()}
                      </span>
                    )}
                    <span className="truncate">
                      {displayName}
                    </span>
                  </Link>
                  <button
                    onClick={handleSignOut}
                    className="text-xs px-3 py-1 rounded-lg border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    Log out
                  </button>
                </>
              ) : (
                <>
                  <Link
                    to="/login"
                    className="text-xs px-3 py-1 rounded-lg border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    Log in
                  </Link>
                  <Link
                    to="/signup"
                    className="text-xs px-3 py-1 rounded-lg bg-primary-600 text-white hover:bg-primary-700 dark:bg-primary-500 dark:hover:bg-primary-600 transition-colors"
                  >
                    Sign up
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
