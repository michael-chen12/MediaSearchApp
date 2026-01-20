import { createContext, useContext, useState, useEffect } from 'react';

const WatchlistContext = createContext();

export function WatchlistProvider({ children }) {
  const [watchlist, setWatchlist] = useState(() => {
    const stored = localStorage.getItem('cinematic_watchlist');
    return stored ? JSON.parse(stored) : { movies: [], tvShows: [] };
  });

  useEffect(() => {
    localStorage.setItem('cinematic_watchlist', JSON.stringify(watchlist));
  }, [watchlist]);

  const addToWatchlist = (item, mediaType) => {
    setWatchlist(prev => {
      const key = mediaType === 'movie' ? 'movies' : 'tvShows';
      // Check if already exists
      if (prev[key].some(item => item.id === item.id)) {
        return prev;
      }
      return {
        ...prev,
        [key]: [...prev[key], item]
      };
    });
  };

  const removeFromWatchlist = (id, mediaType) => {
    setWatchlist(prev => {
      const key = mediaType === 'movie' ? 'movies' : 'tvShows';
      return {
        ...prev,
        [key]: prev[key].filter(item => item.id !== id)
      };
    });
  };

  const isInWatchlist = (id, mediaType) => {
    const key = mediaType === 'movie' ? 'movies' : 'tvShows';
    return watchlist[key].some(item => item.id === id);
  };

  const getWatchlist = (mediaType) => {
    const key = mediaType === 'movie' ? 'movies' : 'tvShows';
    return watchlist[key];
  };

  const toggleWatchlist = (item, mediaType) => {
    if (isInWatchlist(item.id, mediaType)) {
      removeFromWatchlist(item.id, mediaType);
    } else {
      addToWatchlist(item, mediaType);
    }
  };

  return (
    <WatchlistContext.Provider value={{
      watchlist,
      addToWatchlist,
      removeFromWatchlist,
      isInWatchlist,
      getWatchlist,
      toggleWatchlist
    }}>
      {children}
    </WatchlistContext.Provider>
  );
}

export function useWatchlist() {
  const context = useContext(WatchlistContext);
  if (!context) {
    throw new Error('useWatchlist must be used within WatchlistProvider');
  }
  return context;
}
