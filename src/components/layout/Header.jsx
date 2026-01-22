import { useMemo, useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQueries } from '@tanstack/react-query';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { useLists } from '../../context/ListsContext';
import SearchBar from '../common/SearchBar';
import { getTVShowDetails } from '../../lib/tmdbClient';

const buildDateKey = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const startOfWeek = (date) => {
  const value = new Date(date);
  const day = value.getDay();
  const diff = (day + 6) % 7;
  value.setDate(value.getDate() - diff);
  value.setHours(0, 0, 0, 0);
  return value;
};

const isWithinWeek = (dateKey, start, end) => {
  if (!dateKey) return false;
  const date = new Date(`${dateKey}T00:00:00`);
  return date >= start && date < end;
};

export default function Header() {
  const { theme, toggleTheme } = useTheme();
  const { user, profile, signOut, isConfigured } = useAuth();
  const { getSystemListItems, clearSystemListItems } = useLists();
  const navigate = useNavigate();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const dropdownRef = useRef(null);
  const avatarButtonRef = useRef(null);
  const mobileMenuRef = useRef(null);

  const movieWatchlistItems = getSystemListItems('watchlist', 'movie');
  const tvWatchlistItems = getSystemListItems('watchlist', 'tv');
  const watchlistCount = movieWatchlistItems.length + tvWatchlistItems.length;
  const displayName = profile?.display_name?.trim() || user?.email || '';
  const avatarUrl = profile?.avatar_url || '';
  const avatarUrlWithCache = avatarUrl
    ? profile?.updated_at
      ? `${avatarUrl}${avatarUrl.includes('?') ? '&' : '?'}t=${profile.updated_at}`
      : avatarUrl
    : '';

  const tvDetailsQueries = useQueries({
    queries: tvWatchlistItems.map((item) => ({
      queryKey: ['tvShowDetails', item.id],
      queryFn: () => getTVShowDetails(item.id),
      enabled: Boolean(user) && tvWatchlistItems.length > 0,
      staleTime: 1000 * 60 * 60 * 24,
    })),
  });

  const { todayCount, weekCount } = useMemo(() => {
    const todayKey = buildDateKey(new Date());
    const weekStart = startOfWeek(new Date());
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 7);
    let today = 0;
    let week = 0;

    tvDetailsQueries.forEach((query) => {
      const nextEpisode = query.data?.next_episode_to_air;
      if (!nextEpisode?.air_date) return;
      if (nextEpisode.air_date === todayKey) {
        today += 1;
      }
      if (isWithinWeek(nextEpisode.air_date, weekStart, weekEnd)) {
        week += 1;
      }
    });

    return { todayCount: today, weekCount: week };
  }, [tvDetailsQueries]);

  const calendarBadgeCount = weekCount;
  const calendarLabel = calendarBadgeCount > 0
    ? `${calendarBadgeCount} episode${calendarBadgeCount === 1 ? '' : 's'} airing this week`
    : 'View calendar';
  const calendarTitle = calendarBadgeCount > 0
    ? `${todayCount} today · ${calendarBadgeCount} this week`
    : 'No upcoming episodes this week';

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

    const animationEndHandler = () => {
      root.classList.remove('theme-transitioning');
      root.removeEventListener('animationend', animationEndHandler);
    };
    root.addEventListener('animationend', animationEndHandler);
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      clearSystemListItems('watchlist');
      setIsDropdownOpen(false);
      setIsMobileMenuOpen(false);
    } catch {
      // Keep logout resilient even if Supabase has transient issues.
    }
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  const handleMobileMenuNavigation = () => {
    closeMobileMenu();
  };

  useEffect(() => {
    if (!isDropdownOpen) return undefined;
    
    const handleClickOutside = (event) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target) &&
        avatarButtonRef.current &&
        !avatarButtonRef.current.contains(event.target)
      ) {
        setIsDropdownOpen(false);
      }
    };

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isDropdownOpen]);

  useEffect(() => {
    if (!isMobileMenuOpen) return undefined;

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setIsMobileMenuOpen(false);
      }
    };

    // Prevent body scroll when mobile menu is open
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isMobileMenuOpen]);

  return (
    <header className="sticky top-0 z-50 bg-gradient-to-b from-gray-50 via-white to-gray-100 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 shadow-md">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 py-3 sm:py-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 sm:gap-4">
          <Link
            to="/"
            className="text-xl sm:text-2xl font-bold text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 transition-colors"
            aria-label="Go to homepage"
          >
            🎬 ReelRadar
          </Link>

          <div className="flex-1 md:max-w-xl">
            <SearchBar onSearch={handleSearch} />
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-2">
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
                <div className="relative">
                  <button
                    ref={avatarButtonRef}
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    className="flex items-center gap-2 text-xs text-gray-700 dark:text-gray-200 hover:text-primary-600 dark:hover:text-primary-400 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 rounded-full"
                    aria-expanded={isDropdownOpen}
                    aria-haspopup="true"
                  >
                    {avatarUrlWithCache ? (
                      <img
                        src={avatarUrlWithCache}
                        alt="Profile avatar"
                        className="h-8 w-8 rounded-full object-cover border-2 border-gray-200 dark:border-gray-700"
                      />
                    ) : (
                      <span className="h-8 w-8 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 flex items-center justify-center text-sm font-semibold border-2 border-gray-200 dark:border-gray-700">
                        {(displayName || 'U').slice(0, 1).toUpperCase()}
                      </span>
                    )}
                  </button>

                  {isDropdownOpen && (
                    <div
                      ref={dropdownRef}
                      className="absolute -right-4 mt-2 w-56 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-50 animate-in fade-in slide-in-from-top-2 duration-200"
                    >
                      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                          {displayName}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                          {user.email}
                        </p>
                      </div>

                      <Link
                        to="/watchlist"
                        onClick={() => setIsDropdownOpen(false)}
                        className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                      >
                        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                        </svg>
                        <span className="flex-1">Watchlist</span>
                        {watchlistCount > 0 && (
                          <span className="inline-flex items-center justify-center px-2 py-0.5 text-xs font-medium rounded-full bg-primary-100 dark:bg-primary-900 text-primary-800 dark:text-primary-200">
                            {watchlistCount}
                          </span>
                        )}
                      </Link>

                      <Link
                        to="/calendar"
                        onClick={() => setIsDropdownOpen(false)}
                        className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                        title={calendarTitle}
                      >
                        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M8 7V3m8 4V3M4 11h16M5 5h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z" />
                        </svg>
                        <span className="flex-1">Calendar</span>
                        {calendarBadgeCount > 0 && (
                          <span className="inline-flex items-center justify-center px-2 py-0.5 text-xs font-medium rounded-full bg-primary-100 dark:bg-primary-900 text-primary-800 dark:text-primary-200">
                            {calendarBadgeCount}
                          </span>
                        )}
                      </Link>

                      <Link
                        to="/profile"
                        onClick={() => setIsDropdownOpen(false)}
                        className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                      >
                        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z" />
                        </svg>
                        <span className="flex-1">Profile</span>
                      </Link>

                      <hr className="my-1 border-gray-200 dark:border-gray-700" />

                      <button
                        onClick={handleSignOut}
                        className="flex items-center gap-3 w-full px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                      >
                        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" />
                        </svg>
                        <span className="flex-1">Log out</span>
                      </button>
                    </div>
                  )}
                </div>
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

          {/* Mobile Hamburger Button */}
          <button
            onClick={() => setIsMobileMenuOpen(true)}
            className="md:hidden absolute top-3 sm:top-4 right-4 sm:right-6 p-2 rounded-lg text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500"
            aria-label="Open menu"
            aria-expanded={isMobileMenuOpen}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-50 md:hidden transition-opacity duration-300 ease-out"
          onClick={closeMobileMenu}
          style={{ animation: 'fadeIn 300ms ease-out' }}
        />
      )}

      {/* Mobile Slide-in Menu */}
      <div
        ref={mobileMenuRef}
        className={`fixed top-0 right-0 h-full w-80 max-w-[85vw] bg-white dark:bg-gray-900 shadow-2xl z-50 md:hidden transform transition-transform duration-300 ease-out ${
          isMobileMenuOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Mobile Menu Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-800">
            <span className="text-lg font-semibold text-gray-900 dark:text-gray-100">Menu</span>
            <button
              onClick={closeMobileMenu}
              className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500"
              aria-label="Close menu"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Mobile Menu Content */}
          <div className="flex-1 overflow-y-auto">
            {!isConfigured ? (
              <div className="p-6">
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  Auth not configured
                </span>
              </div>
            ) : user ? (
              <div>
                {/* User Info */}
                <div className="p-6 border-b border-gray-200 dark:border-gray-800">
                  <div className="flex items-center gap-3">
                    {avatarUrlWithCache ? (
                      <img
                        src={avatarUrlWithCache}
                        alt="Profile avatar"
                        className="h-12 w-12 rounded-full object-cover border-2 border-gray-200 dark:border-gray-700"
                      />
                    ) : (
                      <span className="h-12 w-12 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 flex items-center justify-center text-lg font-semibold border-2 border-gray-200 dark:border-gray-700">
                        {(displayName || 'U').slice(0, 1).toUpperCase()}
                      </span>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                        {displayName}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        {user.email}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Navigation Links */}
                <nav className="py-2">
                  <Link
                    to="/watchlist"
                    onClick={handleMobileMenuNavigation}
                    className="flex items-center gap-3 px-6 py-3 text-base text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  >
                    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                    </svg>
                    <span className="flex-1">Watchlist</span>
                    {watchlistCount > 0 && (
                      <span className="inline-flex items-center justify-center px-2.5 py-1 text-xs font-medium rounded-full bg-primary-100 dark:bg-primary-900 text-primary-800 dark:text-primary-200">
                        {watchlistCount}
                      </span>
                    )}
                  </Link>

                  <Link
                    to="/calendar"
                    onClick={handleMobileMenuNavigation}
                    className="flex items-center gap-3 px-6 py-3 text-base text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    title={calendarTitle}
                  >
                    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M8 7V3m8 4V3M4 11h16M5 5h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z" />
                    </svg>
                    <span className="flex-1">Calendar</span>
                    {calendarBadgeCount > 0 && (
                      <span className="inline-flex items-center justify-center px-2.5 py-1 text-xs font-medium rounded-full bg-primary-100 dark:bg-primary-900 text-primary-800 dark:text-primary-200">
                        {calendarBadgeCount}
                      </span>
                    )}
                  </Link>

                  <Link
                    to="/profile"
                    onClick={handleMobileMenuNavigation}
                    className="flex items-center gap-3 px-6 py-3 text-base text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  >
                    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z" />
                    </svg>
                    <span className="flex-1">Profile</span>
                  </Link>
                </nav>

                {/* Theme Toggle in Mobile */}
                <div className="px-6 py-3 border-t border-gray-200 dark:border-gray-800">
                  <button
                    onClick={handleThemeToggle}
                    className="flex items-center gap-3 w-full text-base text-gray-700 dark:text-gray-200"
                  >
                    <div className={`theme-toggle ${theme === 'dark' ? 'theme-toggle--dark' : 'theme-toggle--light'}`}>
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
                    </div>
                    <span className="flex-1 text-left">{theme === 'dark' ? 'Dark' : 'Light'} mode</span>
                  </button>
                </div>

                {/* Logout Button */}
                <div className="px-6 py-3 border-t border-gray-200 dark:border-gray-800">
                  <button
                    onClick={handleSignOut}
                    className="flex items-center gap-3 w-full text-base text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 py-2 rounded-lg transition-colors"
                  >
                    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" />
                    </svg>
                    <span className="flex-1 text-left">Log out</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-6 space-y-3">
                <Link
                  to="/login"
                  onClick={handleMobileMenuNavigation}
                  className="flex items-center justify-center w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-base font-medium"
                >
                  Log in
                </Link>
                <Link
                  to="/signup"
                  onClick={handleMobileMenuNavigation}
                  className="flex items-center justify-center w-full px-4 py-3 rounded-lg bg-primary-600 text-white hover:bg-primary-700 dark:bg-primary-500 dark:hover:bg-primary-600 transition-colors text-base font-medium"
                >
                  Sign up
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
