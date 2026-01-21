import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { events } from '../lib/analytics';
import { isSupabaseConfigured, supabase } from '../lib/supabaseClient';
import { useAuth } from './AuthContext';

const FavoritesContext = createContext();
const FAVORITES_STORAGE_KEY = 'cinematic_favorites';
const FAVORITES_MIGRATION_KEY = 'cinematic_favorites_migrated';
const emptyList = { movies: [], tvShows: [] };

const readLocalFavorites = () => {
  try {
    const stored = localStorage.getItem(FAVORITES_STORAGE_KEY);
    return stored ? JSON.parse(stored) : emptyList;
  } catch (error) {
    return emptyList;
  }
};

const buildListItemPayload = (listId, item, mediaType) => {
  const title = mediaType === 'movie' ? item.title : item.name;
  const releaseDate = mediaType === 'movie' ? item.release_date : item.first_air_date;

  return {
    list_id: listId,
    media_type: mediaType,
    media_id: item.id,
    title: title || item.title || item.name || '',
    poster_path: item.poster_path || null,
    release_date: releaseDate || null,
    added_at: item.added_at || new Date().toISOString(),
    extra: item,
  };
};

const mapRemoteItems = (items) => items.reduce((acc, item) => {
  const extra = item.extra && typeof item.extra === 'object' ? item.extra : {};
  const normalized = {
    ...extra,
    id: item.media_id,
    title: extra.title || item.title || extra.name || '',
    name: extra.name || item.title || extra.title || '',
    poster_path: extra.poster_path || item.poster_path || null,
    release_date: extra.release_date || item.release_date || null,
    first_air_date: extra.first_air_date || item.release_date || null,
    added_at: item.added_at || extra.added_at || null,
  };

  if (item.media_type === 'movie') {
    acc.movies.push(normalized);
  } else {
    acc.tvShows.push(normalized);
  }

  return acc;
}, { movies: [], tvShows: [] });

export function FavoritesProvider({ children }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [favorites, setFavorites] = useState(readLocalFavorites);
  const [warning, setWarning] = useState('');

  useEffect(() => {
    localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(favorites));
  }, [favorites]);

  const listQuery = useQuery({
    queryKey: ['lists', user?.id, 'favorites'],
    enabled: Boolean(user && isSupabaseConfigured),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lists')
        .upsert({
          user_id: user.id,
          type: 'favorites',
          name: 'Favorites',
        }, { onConflict: 'user_id,type' })
        .select('id')
        .single();

      if (error) throw error;
      return data;
    },
  });

  const listId = user ? listQuery.data?.id : null;

  const itemsQuery = useQuery({
    queryKey: ['list-items', listId],
    enabled: Boolean(listId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('list_items')
        .select('*')
        .eq('list_id', listId)
        .order('added_at', { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const hydrateFromRemote = useCallback((items = []) => {
    setFavorites(mapRemoteItems(items));
  }, []);

  useEffect(() => {
    if (itemsQuery.isSuccess) {
      hydrateFromRemote(itemsQuery.data || []);
      setWarning('');
    }
  }, [hydrateFromRemote, itemsQuery.data, itemsQuery.isSuccess]);

  useEffect(() => {
    if (itemsQuery.error || listQuery.error) {
      setWarning('Unable to sync favorites. Showing local data.');
    }
  }, [itemsQuery.error, listQuery.error]);

  useEffect(() => {
    if (!user) {
      setWarning('');
    }
  }, [user]);

  const migrateLocalToRemoteOnce = useCallback(async () => {
    if (!user || !listId || !isSupabaseConfigured) return;
    if (localStorage.getItem(FAVORITES_MIGRATION_KEY)) return;

    const moviesPayload = favorites.movies.map((item) => buildListItemPayload(listId, item, 'movie'));
    const tvPayload = favorites.tvShows.map((item) => buildListItemPayload(listId, item, 'tv'));
    const payload = [...moviesPayload, ...tvPayload];

    if (payload.length > 0) {
      const { error } = await supabase
        .from('list_items')
        .upsert(payload, { onConflict: 'list_id,media_type,media_id' });

      if (error) {
        setWarning('Unable to migrate local favorites.');
        return;
      }
    }

    localStorage.setItem(FAVORITES_MIGRATION_KEY, 'true');
    queryClient.invalidateQueries({ queryKey: ['list-items', listId] });
  }, [favorites, listId, queryClient, user]);

  useEffect(() => {
    if (user && listId) {
      migrateLocalToRemoteOnce();
    }
  }, [listId, migrateLocalToRemoteOnce, user]);

  const addMutation = useMutation({
    mutationFn: async ({ item, mediaType }) => {
      const payload = buildListItemPayload(listId, item, mediaType);
      const { error } = await supabase
        .from('list_items')
        .upsert([payload], { onConflict: 'list_id,media_type,media_id' });

      if (error) throw error;
    },
    onSuccess: () => {
      if (listId) {
        queryClient.invalidateQueries({ queryKey: ['list-items', listId] });
      }
    },
    onError: () => {
      setWarning('Unable to sync favorites changes.');
    },
  });

  const removeMutation = useMutation({
    mutationFn: async ({ id, mediaType }) => {
      const { error } = await supabase
        .from('list_items')
        .delete()
        .eq('list_id', listId)
        .eq('media_type', mediaType)
        .eq('media_id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      if (listId) {
        queryClient.invalidateQueries({ queryKey: ['list-items', listId] });
      }
    },
    onError: () => {
      setWarning('Unable to sync favorites changes.');
    },
  });

  const addFavorite = (item, mediaType) => {
    setFavorites((prev) => {
      const key = mediaType === 'movie' ? 'movies' : 'tvShows';
      if (prev[key].some((fav) => fav.id === item.id)) {
        return prev;
      }

      events.addToFavorites(
        mediaType,
        item.id,
        item.title || item.name
      );

      return {
        ...prev,
        [key]: [...prev[key], { ...item, added_at: item.added_at || new Date().toISOString() }],
      };
    });

    if (user && listId && isSupabaseConfigured) {
      addMutation.mutate({ item, mediaType });
    }
  };

  const removeFavorite = (id, mediaType) => {
    setFavorites((prev) => {
      const key = mediaType === 'movie' ? 'movies' : 'tvShows';
      const item = prev[key].find((current) => current.id === id);

      if (item) {
        events.removeFromFavorites(
          mediaType,
          id,
          item.title || item.name
        );
      }

      return {
        ...prev,
        [key]: prev[key].filter((current) => current.id !== id),
      };
    });

    if (user && listId && isSupabaseConfigured) {
      removeMutation.mutate({ id, mediaType });
    }
  };

  const isFavorite = (id, mediaType) => {
    const key = mediaType === 'movie' ? 'movies' : 'tvShows';
    return favorites[key].some((item) => item.id === id);
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

  const clearFavorites = () => {
    setFavorites(emptyList);
    setWarning('');
  };

  const source = user && itemsQuery.isSuccess ? 'remote' : 'local';

  return (
    <FavoritesContext.Provider value={{
      favorites,
      addFavorite,
      removeFavorite,
      isFavorite,
      getFavorites,
      toggleFavorite,
      clearFavorites,
      hydrateFromRemote,
      migrateLocalToRemoteOnce,
      isLoading: itemsQuery.isLoading || listQuery.isLoading,
      warning,
      source,
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
