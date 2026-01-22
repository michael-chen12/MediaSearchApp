import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { events } from '../lib/analytics';
import { isSupabaseConfigured, supabase } from '../lib/supabaseClient';
import { useAuth } from './AuthContext';
import { normalizeNotes, normalizeTags } from '../utils/annotations';

const ListsContext = createContext();

const LISTS_STORAGE_KEY = 'cinematic_lists_v2';
const LISTS_MIGRATION_KEY = 'cinematic_lists_migrated_v2';
const LEGACY_WATCHLIST_KEY = 'cinematic_watchlist';
const SYSTEM_LISTS = [
  { type: 'watchlist', name: 'Watchlist', position: 0 },
];
const RETIRED_LIST_TYPES = new Set(['favorites']);

const emptyItems = () => ({ movies: [], tvShows: [] });

const normalizeNumber = (value) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : undefined;
};

const deriveGenreIds = (item) => {
  if (Array.isArray(item.genre_ids) && item.genre_ids.length > 0) {
    return item.genre_ids
      .map((id) => Number(id))
      .filter((id) => Number.isFinite(id));
  }
  if (Array.isArray(item.genres) && item.genres.length > 0) {
    return item.genres
      .map((genre) => Number(genre?.id))
      .filter((id) => Number.isFinite(id));
  }
  return [];
};

const normalizeListItem = (item) => {
  if (!item || typeof item !== 'object') return item;
  const genreIds = deriveGenreIds(item);
  const popularity = normalizeNumber(item.popularity);
  const voteAverage = normalizeNumber(item.vote_average);

  return {
    ...item,
    genre_ids: genreIds.length > 0 ? genreIds : item.genre_ids || [],
    ...(popularity !== undefined ? { popularity } : {}),
    ...(voteAverage !== undefined ? { vote_average: voteAverage } : {}),
  };
};

const REMOTE_ITEM_FIELDS = new Set([
  'notes',
  'tags',
  'title',
  'poster_path',
  'release_date',
  'added_at',
  'position',
]);

const normalizeItemUpdates = (updates) => {
  const stateUpdates = { ...updates };
  const remoteUpdates = { ...updates };

  if (Object.prototype.hasOwnProperty.call(updates, 'notes')) {
    const notes = normalizeNotes(updates.notes);
    stateUpdates.notes = notes;
    remoteUpdates.notes = notes || null;
  }

  if (Object.prototype.hasOwnProperty.call(updates, 'tags')) {
    const tags = normalizeTags(updates.tags);
    stateUpdates.tags = tags;
    remoteUpdates.tags = tags.length > 0 ? tags : null;
  }

  if (Object.prototype.hasOwnProperty.call(remoteUpdates, 'name')) {
    delete remoteUpdates.name;
  }
  if (Object.prototype.hasOwnProperty.call(remoteUpdates, 'first_air_date')) {
    delete remoteUpdates.first_air_date;
  }

  Object.keys(remoteUpdates).forEach((key) => {
    if (!REMOTE_ITEM_FIELDS.has(key)) {
      delete remoteUpdates[key];
    }
  });

  return { stateUpdates, remoteUpdates };
};

const buildLocalState = (overrides = {}) => ({
  lists: SYSTEM_LISTS.map((list) => ({
    ...list,
    id: `local-${list.type}`,
  })),
  itemsByListId: {
    'local-watchlist': emptyItems(),
  },
  ...overrides,
});

const stripRetiredListsFromState = (state) => {
  if (!state?.lists || !state?.itemsByListId) return state;
  const filteredLists = state.lists.filter((list) => !RETIRED_LIST_TYPES.has(list.type));
  if (filteredLists.length === 0) {
    return buildLocalState();
  }
  const allowedIds = new Set(filteredLists.map((list) => list.id));
  const filteredItems = Object.fromEntries(
    Object.entries(state.itemsByListId).filter(([listId]) => allowedIds.has(listId))
  );
  return {
    ...state,
    lists: filteredLists,
    itemsByListId: filteredItems,
  };
};

const safeParse = (value, fallback) => {
  try {
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
};

const readLegacyItems = () => {
  const watchlist = safeParse(localStorage.getItem(LEGACY_WATCHLIST_KEY), emptyItems());
  return buildLocalState({
    itemsByListId: {
      'local-watchlist': watchlist,
    },
  });
};

const readLocalState = () => {
  const stored = safeParse(localStorage.getItem(LISTS_STORAGE_KEY), null);
  if (stored?.lists && stored?.itemsByListId) {
    return stripRetiredListsFromState(stored);
  }
  return readLegacyItems();
};

const buildListItemPayload = (listId, item, mediaType, position) => {
  const normalizedItem = normalizeListItem(item);
  const title = mediaType === 'movie' ? item.title : item.name;
  const releaseDate = mediaType === 'movie' ? item.release_date : item.first_air_date;
  const notesSource = item.notes ?? item.extra?.notes;
  const tagsSource = item.tags ?? item.extra?.tags;
  const notes = normalizeNotes(notesSource);
  const tags = normalizeTags(tagsSource);

  return {
    list_id: listId,
    media_type: mediaType,
    media_id: item.id,
    title: title || item.title || item.name || '',
    poster_path: item.poster_path || null,
    release_date: releaseDate || null,
    added_at: item.added_at || new Date().toISOString(),
    notes: notes || null,
    tags: tags.length > 0 ? tags : null,
    position: Number.isFinite(position) ? position : item.position || 0,
    extra: normalizedItem,
  };
};

const mapRemoteItems = (items) => items.reduce((acc, item) => {
  const listId = item.list_id;
  if (!acc[listId]) {
    acc[listId] = emptyItems();
  }

  const extra = item.extra && typeof item.extra === 'object' ? item.extra : {};
  const notesSource = item.notes ?? extra.notes;
  const tagsSource = item.tags ?? extra.tags;
  const normalized = normalizeListItem({
    ...extra,
    id: item.media_id,
    list_item_id: item.id,
    list_id: listId,
    title: extra.title || item.title || extra.name || '',
    name: extra.name || item.title || extra.title || '',
    poster_path: extra.poster_path || item.poster_path || null,
    release_date: extra.release_date || item.release_date || null,
    first_air_date: extra.first_air_date || item.release_date || null,
    added_at: item.added_at || extra.added_at || null,
    position: item.position ?? 0,
    notes: normalizeNotes(notesSource),
    tags: normalizeTags(tagsSource),
  });

  if (item.media_type === 'movie') {
    acc[listId].movies.push(normalized);
  } else {
    acc[listId].tvShows.push(normalized);
  }

  return acc;
}, {});

const sortItemsByPosition = (items) => [...items].sort((a, b) => (a.position ?? 0) - (b.position ?? 0));

const preserveLocalFields = (remoteItem, localItem) => {
  if (!localItem) return remoteItem;
  const merged = { ...remoteItem };
  const fields = ['number_of_episodes', 'seasons'];
  fields.forEach((field) => {
    if (merged[field] === undefined && localItem[field] !== undefined) {
      merged[field] = localItem[field];
    }
  });
  return merged;
};

export function ListsProvider({ children }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const initialState = useMemo(() => readLocalState(), []);
  const [lists, setLists] = useState(initialState.lists);
  const [itemsByListId, setItemsByListId] = useState(initialState.itemsByListId);
  const [warning, setWarning] = useState('');

  useEffect(() => {
    if (!user || !isSupabaseConfigured) {
      localStorage.setItem(LISTS_STORAGE_KEY, JSON.stringify({ lists, itemsByListId }));
    }
  }, [lists, itemsByListId, user]);

  const listsQuery = useQuery({
    queryKey: ['lists', user?.id],
    enabled: Boolean(user && isSupabaseConfigured),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lists')
        .select('*')
        .eq('user_id', user.id)
        .order('position', { ascending: true })
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data;
    },
  });

  const visibleLists = useMemo(
    () => (listsQuery.data || []).filter((list) => !RETIRED_LIST_TYPES.has(list.type)),
    [listsQuery.data]
  );

  const ensureSystemLists = useCallback(async () => {
    if (!user || !isSupabaseConfigured) return;
    const existing = listsQuery.data || [];
    const missing = SYSTEM_LISTS.filter(
      (list) => !existing.some((current) => current.type === list.type)
    );

    if (missing.length === 0) return;

    const payload = missing.map((list) => ({
      user_id: user.id,
      name: list.name,
      type: list.type,
      position: list.position,
    }));

    const { error } = await supabase
      .from('lists')
      .upsert(payload, { onConflict: 'user_id,name' });

    if (!error) {
      queryClient.invalidateQueries({ queryKey: ['lists', user.id] });
    }
  }, [listsQuery.data, queryClient, user]);

  useEffect(() => {
    if (listsQuery.isSuccess) {
      setLists(visibleLists);
      setWarning('');
    }
  }, [listsQuery.isSuccess, visibleLists]);

  useEffect(() => {
    if (listsQuery.isSuccess) {
      ensureSystemLists();
    }
  }, [ensureSystemLists, listsQuery.isSuccess]);

  useEffect(() => {
    if (listsQuery.error) {
      setWarning('Unable to sync lists. Showing local data.');
    }
  }, [listsQuery.error]);

  const listIds = useMemo(
    () => visibleLists.map((list) => list.id),
    [visibleLists]
  );

  const itemsQuery = useQuery({
    queryKey: ['list-items', user?.id],
    enabled: Boolean(listIds.length),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('list_items')
        .select('*')
        .in('list_id', listIds)
        .order('position', { ascending: true })
        .order('added_at', { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (itemsQuery.isSuccess) {
      const mapped = mapRemoteItems(itemsQuery.data || []);
      setItemsByListId((prev) => {
        const nextItems = {};
        visibleLists.forEach((list) => {
          const listItems = mapped[list.id] || emptyItems();
          const prevItems = prev[list.id] || emptyItems();
          const mergeList = (remoteList, localList) => remoteList.map((item) => (
            preserveLocalFields(item, localList.find((local) => local.id === item.id))
          ));
          nextItems[list.id] = {
            movies: sortItemsByPosition(mergeList(listItems.movies, prevItems.movies)),
            tvShows: sortItemsByPosition(mergeList(listItems.tvShows, prevItems.tvShows)),
          };
        });
        return nextItems;
      });
      setWarning('');
    }
  }, [itemsQuery.data, itemsQuery.isSuccess, visibleLists]);

  useEffect(() => {
    if (itemsQuery.error) {
      setWarning('Unable to sync list items. Showing local data.');
    }
  }, [itemsQuery.error]);

  useEffect(() => {
    if (!user) {
      setWarning('');
    }
  }, [user]);

  const migrateLocalToRemoteOnce = useCallback(async () => {
    if (!user || !isSupabaseConfigured) return;
    if (localStorage.getItem(LISTS_MIGRATION_KEY)) return;

    const localState = readLocalState();
    const watchlist = visibleLists.find((list) => list.type === 'watchlist');

    if (!watchlist) return;

    const payload = [];
    const localWatchlist = localState.itemsByListId['local-watchlist'] || emptyItems();

    localWatchlist.movies.forEach((item, index) => {
      payload.push(buildListItemPayload(watchlist.id, item, 'movie', index));
    });
    localWatchlist.tvShows.forEach((item, index) => {
      payload.push(buildListItemPayload(watchlist.id, item, 'tv', index));
    });

    if (payload.length > 0) {
      const { error } = await supabase
        .from('list_items')
        .upsert(payload, { onConflict: 'list_id,media_type,media_id' });

      if (error) {
        setWarning('Unable to migrate local lists.');
        return;
      }
    }

    localStorage.setItem(LISTS_MIGRATION_KEY, 'true');
    queryClient.invalidateQueries({ queryKey: ['list-items', user.id] });
  }, [queryClient, user, visibleLists]);

  useEffect(() => {
    if (user && listsQuery.isSuccess) {
      migrateLocalToRemoteOnce();
    }
  }, [listsQuery.isSuccess, migrateLocalToRemoteOnce, user]);

  const addItemMutation = useMutation({
    mutationFn: async ({ listId, item, mediaType, position }) => {
      const payload = buildListItemPayload(listId, item, mediaType, position);
      const { error } = await supabase
        .from('list_items')
        .upsert([payload], { onConflict: 'list_id,media_type,media_id' });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['list-items', user?.id] });
    },
    onError: () => {
      setWarning('Unable to sync list changes.');
    },
  });

  const removeItemMutation = useMutation({
    mutationFn: async ({ listId, id, mediaType }) => {
      const { error } = await supabase
        .from('list_items')
        .delete()
        .eq('list_id', listId)
        .eq('media_type', mediaType)
        .eq('media_id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['list-items', user?.id] });
    },
    onError: () => {
      setWarning('Unable to sync list changes.');
    },
  });

  const reorderItemsMutation = useMutation({
    mutationFn: async ({ listId, updates, mediaType }) => {
      const payload = updates
        .filter((item) => item.list_item_id)
        .map((item) => ({
          id: item.list_item_id,
          list_id: item.list_id || listId,
          media_type: mediaType,
          media_id: item.id,
          position: item.position,
        }));
      if (payload.length === 0) {
        return;
      }
      const { error } = await supabase
        .from('list_items')
        .upsert(payload, { onConflict: 'id' });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['list-items', user?.id] });
    },
    onError: (error) => {
      setWarning(error?.message || 'Unable to save item order.');
    },
  });

  const updateItemMutation = useMutation({
    mutationFn: async ({ listItemId, updates }) => {
      const { error } = await supabase
        .from('list_items')
        .update(updates)
        .eq('id', listItemId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['list-items', user?.id] });
    },
    onError: () => {
      setWarning('Unable to update list item.');
    },
  });

  const createListMutation = useMutation({
    mutationFn: async ({ name }) => {
      const payload = {
        user_id: user.id,
        name,
        type: 'custom',
        position: lists.length,
      };
      const { data, error } = await supabase
        .from('lists')
        .insert(payload)
        .select('*')
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lists', user?.id] });
    },
    onError: () => {
      setWarning('Unable to create list.');
    },
  });

  const renameListMutation = useMutation({
    mutationFn: async ({ listId, name }) => {
      const { error } = await supabase
        .from('lists')
        .update({ name, updated_at: new Date().toISOString() })
        .eq('id', listId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lists', user?.id] });
    },
    onError: () => {
      setWarning('Unable to rename list.');
    },
  });

  const deleteListMutation = useMutation({
    mutationFn: async ({ listId }) => {
      const { error } = await supabase
        .from('lists')
        .delete()
        .eq('id', listId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lists', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['list-items', user?.id] });
    },
    onError: () => {
      setWarning('Unable to delete list.');
    },
  });

  const reorderListsMutation = useMutation({
    mutationFn: async ({ updates }) => {
      const payload = updates.map((list) => ({
        id: list.id,
        position: list.position,
      }));
      const { error } = await supabase
        .from('lists')
        .upsert(payload, { onConflict: 'id' });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lists', user?.id] });
    },
    onError: () => {
      setWarning('Unable to save list order.');
    },
  });

  const getListItems = useCallback((listId, mediaType) => {
    const listItems = itemsByListId[listId] || emptyItems();
    const key = mediaType === 'movie' ? 'movies' : 'tvShows';
    return listItems[key] || [];
  }, [itemsByListId]);

  const isItemInList = useCallback((listId, id, mediaType) => {
    return getListItems(listId, mediaType).some((item) => item.id === id);
  }, [getListItems]);

  const addItemToList = useCallback((listId, item, mediaType) => {
    if (user && isSupabaseConfigured && listId.startsWith('local-')) {
      return;
    }
    const normalizedItem = normalizeListItem(item);
    const notesSource = item.notes ?? item.extra?.notes;
    const tagsSource = item.tags ?? item.extra?.tags;
    const normalizedNotes = normalizeNotes(notesSource);
    const normalizedTags = normalizeTags(tagsSource);
    setItemsByListId((prev) => {
      const listItems = prev[listId] || emptyItems();
      const key = mediaType === 'movie' ? 'movies' : 'tvShows';

      if (listItems[key].some((existing) => existing.id === item.id)) {
        return prev;
      }

      const nextItem = {
        ...normalizedItem,
        notes: normalizedNotes,
        tags: normalizedTags,
        added_at: normalizedItem.added_at || new Date().toISOString(),
        position: listItems[key].length,
      };

      return {
        ...prev,
        [listId]: {
          ...listItems,
          [key]: [...listItems[key], nextItem],
        },
      };
    });

    const list = lists.find((current) => current.id === listId);
    if (list?.type === 'watchlist') {
      events.addToWatchlist(mediaType, item.id, item.title || item.name);
    }

    if (user && isSupabaseConfigured) {
      const listItems = itemsByListId[listId] || emptyItems();
      const position = (mediaType === 'movie' ? listItems.movies : listItems.tvShows).length;
      addItemMutation.mutate({ listId, item, mediaType, position });
    }
  }, [addItemMutation, itemsByListId, lists, user]);

  const removeItemFromList = useCallback((listId, id, mediaType) => {
    if (user && isSupabaseConfigured && listId.startsWith('local-')) {
      return;
    }
    let nextItemsSnapshot = null;
    setItemsByListId((prev) => {
      const listItems = prev[listId] || emptyItems();
      const key = mediaType === 'movie' ? 'movies' : 'tvShows';
      const item = listItems[key].find((current) => current.id === id);

      const nextItems = listItems[key].filter((current) => current.id !== id);
      const reindexed = nextItems.map((current, index) => ({
        ...current,
        position: index,
      }));
      nextItemsSnapshot = reindexed;

      if (item) {
        const list = lists.find((current) => current.id === listId);
        if (list?.type === 'watchlist') {
          events.removeFromWatchlist(mediaType, id, item.title || item.name);
        }
      }

      return {
        ...prev,
        [listId]: {
          ...listItems,
          [key]: reindexed,
        },
      };
    });

    if (user && isSupabaseConfigured) {
      removeItemMutation.mutate({ listId, id, mediaType });
      if (nextItemsSnapshot && nextItemsSnapshot.length > 0) {
        const updates = nextItemsSnapshot
          .filter((current) => current.list_item_id)
          .map((current, index) => ({
            ...current,
            position: index,
          }));
        if (updates.length > 0) {
          reorderItemsMutation.mutate({ listId, updates, mediaType });
        }
      }
    }
  }, [lists, removeItemMutation, reorderItemsMutation, user]);

  const toggleItemInList = useCallback((listId, item, mediaType) => {
    if (isItemInList(listId, item.id, mediaType)) {
      removeItemFromList(listId, item.id, mediaType);
    } else {
      addItemToList(listId, item, mediaType);
    }
  }, [addItemToList, isItemInList, removeItemFromList]);

  const reorderItems = useCallback((listId, mediaType, nextItems, options = {}) => {
    setItemsByListId((prev) => {
      const listItems = prev[listId] || emptyItems();
      const key = mediaType === 'movie' ? 'movies' : 'tvShows';
      return {
        ...prev,
        [listId]: {
          ...listItems,
          [key]: nextItems,
        },
      };
    });

    const shouldPersist = options.persist !== false;
    if (shouldPersist && user && isSupabaseConfigured && !listId.startsWith('local-')) {
      const updates = nextItems.map((item, index) => ({
        ...item,
        position: index,
      }));
      reorderItemsMutation.mutate({ listId, updates, mediaType });
    }
  }, [reorderItemsMutation, user]);

  const updateItemDetails = useCallback((listId, id, mediaType, updates) => {
    const { stateUpdates, remoteUpdates } = normalizeItemUpdates(updates);
    let listItemId = null;
    setItemsByListId((prev) => {
      const listItems = prev[listId] || emptyItems();
      const key = mediaType === 'movie' ? 'movies' : 'tvShows';
      const nextItems = listItems[key].map((item) => {
        if (item.id !== id) return item;
        listItemId = item.list_item_id;
        return {
          ...item,
          ...stateUpdates,
        };
      });

      return {
        ...prev,
        [listId]: {
          ...listItems,
          [key]: nextItems,
        },
      };
    });

    const shouldSync = user && isSupabaseConfigured && !listId.startsWith('local-');
    if (shouldSync && typeof navigator !== 'undefined' && navigator.onLine === false) {
      return Promise.reject(new Error('Unable to sync list item.'));
    }
    if (shouldSync && listItemId) {
      return updateItemMutation.mutateAsync({ listItemId, updates: remoteUpdates });
    }
    if (shouldSync) {
      return Promise.reject(new Error('Unable to sync list item.'));
    }
    return Promise.resolve();
  }, [updateItemMutation, user]);

  const createList = useCallback(async (name) => {
    if (!user || !isSupabaseConfigured) {
      throw new Error('Sign in to create lists.');
    }
    const trimmed = name.trim();
    if (!trimmed) {
      throw new Error('List name is required.');
    }
    return createListMutation.mutateAsync({ name: trimmed });
  }, [createListMutation, user]);

  const renameList = useCallback(async (listId, name) => {
    if (!user || !isSupabaseConfigured) {
      throw new Error('Sign in to rename lists.');
    }
    const trimmed = name.trim();
    if (!trimmed) {
      throw new Error('List name is required.');
    }
    await renameListMutation.mutateAsync({ listId, name: trimmed });
  }, [renameListMutation, user]);

  const deleteList = useCallback(async (listId) => {
    if (!user || !isSupabaseConfigured) {
      throw new Error('Sign in to delete lists.');
    }
    await deleteListMutation.mutateAsync({ listId });
  }, [deleteListMutation, user]);

  const reorderLists = useCallback((nextLists) => {
    setLists(nextLists);

    if (user && isSupabaseConfigured) {
      const updates = nextLists.map((list, index) => ({
        id: list.id,
        position: index,
      }));
      reorderListsMutation.mutate({ updates });
    }
  }, [reorderListsMutation, user]);

  const systemLists = useMemo(() => ({
    watchlist: lists.find(
      (list) => list.type === 'watchlist' || list.name.toLowerCase() === 'watchlist'
    ) || null,
  }), [lists]);

  const getSystemListItems = useCallback((type, mediaType) => {
    const list = systemLists[type];
    if (!list) return [];
    return getListItems(list.id, mediaType);
  }, [getListItems, systemLists]);

  const isInSystemList = useCallback((type, id, mediaType) => {
    const list = systemLists[type];
    if (!list) return false;
    return isItemInList(list.id, id, mediaType);
  }, [isItemInList, systemLists]);

  const toggleSystemList = useCallback((type, item, mediaType) => {
    const list = systemLists[type];
    if (!list) return;
    toggleItemInList(list.id, item, mediaType);
  }, [systemLists, toggleItemInList]);

  const clearSystemListItems = useCallback((type) => {
    const list = systemLists[type];
    if (!list) return;
    setItemsByListId((prev) => ({
      ...prev,
      [list.id]: emptyItems(),
    }));
  }, [systemLists]);

  const source = user && listsQuery.isSuccess ? 'remote' : 'local';

  return (
    <ListsContext.Provider value={{
      lists,
      systemLists,
      getListItems,
      getSystemListItems,
      isItemInList,
      isInSystemList,
      toggleSystemList,
      toggleItemInList,
      addItemToList,
      removeItemFromList,
      reorderItems,
      updateItemDetails,
      createList,
      renameList,
      deleteList,
      reorderLists,
      clearSystemListItems,
      isLoading: listsQuery.isLoading || itemsQuery.isLoading,
      warning,
      source,
      canManageLists: Boolean(user && isSupabaseConfigured),
    }}>
      {children}
    </ListsContext.Provider>
  );
}

export function useLists() {
  const context = useContext(ListsContext);
  if (!context) {
    throw new Error('useLists must be used within ListsProvider');
  }
  return context;
}
