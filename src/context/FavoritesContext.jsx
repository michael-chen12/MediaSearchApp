import { createContext, useContext, useState, useEffect } from 'react';
import { events } from '../lib/analytics';

const FavoritesContext = createContext();

export function FavoritesProvider({ children }) {
  const [favorites, setFavorites] = useState(() => {
    const stored = localStorage.getItem('cinematic_favorites');
    return stored ? JSON.parse(stored) : { movies: [], tvShows: [] };
  });

  useEffect(() => {
    localStorage.setItem('cinematic_favorites', JSON.stringify(favorites));
  }, [favorites]);

  const addFavorite = (item, mediaType) => {
    setFavorites(prev => {
      const key = mediaType === 'movie' ? 'movies' : 'tvShows';
      // Check if already exists
      if (prev[key].some(fav => fav.id === item.id)) {
        return prev;
      }
      
      // Track analytics event
      events.addToFavorites(
        mediaType,
        item.id,
        item.title || item.name
      );
      
      return {
        ...prev,
        [key]: [...prev[key], item]
      };
    });
  };

  const removeFavorite = (id, mediaType) => {
    setFavorites(prev => {
      const key = mediaType === 'movie' ? 'movies' : 'tvShows';
      const item = prev[key].find(item => item.id === id);
      
      // Track analytics event
      if (item) {
        events.removeFromFavorites(
          mediaType,
          id,
          item.title || item.name
        );
      }
      
      return {
        ...prev,
        [key]: prev[key].filter(item => item.id !== id)
      };
    });
  };

  const isFavorite = (id, mediaType) => {
    const key = mediaType === 'movie' ? 'movies' : 'tvShows';
    return favorites[key].some(item => item.id === id);
  };

  const getFavorites = (mediaType) => {
    const key = mediaType === 'movie' ? 'movies' : 'tvShows';
    return favorites[key];
  };

  const toggleFavorite = (item, mediaType) => {
    if (isFavorite(item.id, mediaType)) {
      removeFavorite(item.id, mediaType);
    } else {
      addFavorite(item, mediaType);
    }
  };

  return (
    <FavoritesContext.Provider value={{
      favorites,
      addFavorite,
      removeFavorite,
      isFavorite,
      getFavorites,
      toggleFavorite
    }}>
      {children}
    </FavoritesContext.Provider>
  );
}

export function useFavorites() {
  const context = useContext(FavoritesContext);
  if (!context) {
    throw new Error('useFavorites must be used within FavoritesProvider');
  }
  return context;
}
