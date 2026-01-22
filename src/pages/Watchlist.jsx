import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useQuery, useQueries } from '@tanstack/react-query';
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useLists } from '../context/ListsContext';
import TabNavigation from '../components/common/navigation/TabNavigation';
import MovieCard from '../components/common/MovieCard';
import TVShowCard from '../components/common/TVShowCard';
import EmptyState from '../components/common/EmptyState';
import { MovieGridSkeleton } from '../components/common/LoadingSkeleton';
import Modal from '../components/common/Modal';
import FloatingModeActions from '../components/common/FloatingModeActions';
import Button from '../components/base/Button';
import {
  getGenreList,
  getMovieDetails,
  getTVShowDetails,
  getWatchProviderRegions,
  getWatchProviders,
} from '../lib/tmdbClient';
import {
  formatNotesPreview,
  normalizeNotes,
  normalizeTags,
  tagsEqual,
} from '../utils/annotations';

function SortableItem({ id, disabled, className, children }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, disabled });
  const shouldIgnoreDrag = (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return false;
    return Boolean(target.closest('button, input, textarea, select, label'));
  };
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    touchAction: disabled ? undefined : 'none',
  };
  const combinedClassName = `${className || ''}${isDragging ? ' opacity-40' : ''}`.trim();
  const attributeProps = disabled ? {} : attributes;
  const listenerProps = disabled ? {} : {
    ...listeners,
    onPointerDown: (event) => {
      if (shouldIgnoreDrag(event)) return;
      listeners.onPointerDown?.(event);
    },
    onMouseDown: (event) => {
      if (shouldIgnoreDrag(event)) return;
      listeners.onMouseDown?.(event);
    },
    onTouchStart: (event) => {
      if (shouldIgnoreDrag(event)) return;
      listeners.onTouchStart?.(event);
    },
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={combinedClassName}
      {...attributeProps}
      {...listenerProps}
    >
      {children}
    </div>
  );
}

function SelectionToggle({ selected, onToggle, label }) {
  const labelText = label || 'item';
  return (
    <button
      type="button"
      className={`selection-toggle${selected ? ' selection-toggle--active' : ''}`}
      onClick={onToggle}
      aria-pressed={selected}
      aria-label={`${selected ? 'Deselect' : 'Select'} ${labelText}`}
    >
      <span className="sr-only">{selected ? 'Deselect' : 'Select'}</span>
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M7 12.5l3 3 7-7"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}

const DEFAULT_PROVIDER_REGION = (import.meta.env.VITE_WATCH_PROVIDER_REGION || '').trim();
const PROVIDER_BUCKETS = ['flatrate', 'rent', 'buy', 'ads', 'free'];
const PROVIDER_TYPE_OPTIONS = [
  { id: 'flatrate', label: 'Streaming' },
  { id: 'rent', label: 'Rent' },
  { id: 'buy', label: 'Buy' },
  { id: 'ads', label: 'Ads' },
  { id: 'free', label: 'Free' },
];
const SORT_OPTIONS = [
  { id: 'manual', label: 'Manual' },
  { id: 'recent', label: 'Recently added' },
  { id: 'title', label: 'Title' },
  { id: 'release', label: 'Release date' },
  { id: 'popularity', label: 'Popularity' },
];
const PROVIDER_CACHE_KEY = 'watch_providers_cache_v1';
const PROVIDER_CACHE_TTL = 1000 * 60 * 60 * 24;
const MAX_METADATA_FETCH = 25;
const TAG_PREVIEW_COUNT = 2;
const TAG_LIMIT = 8;
const TAG_MAX_LENGTH = 20;
const NOTES_MAX_LENGTH = 500;

const providerCacheState = {
  loaded: false,
  data: {},
};

const inferProviderRegion = () => {
  if (DEFAULT_PROVIDER_REGION) return DEFAULT_PROVIDER_REGION.toUpperCase();
  if (typeof navigator === 'undefined') return 'US';
  const parts = (navigator.language || '').split('-').filter(Boolean);
  if (parts.length < 2) return 'US';
  return parts[parts.length - 1].toUpperCase();
};

const normalizeNumber = (value) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : undefined;
};

const TAG_SPLIT_REGEX = /[,\n]+/;

const normalizeTagValue = (value) => value.trim().replace(/\s+/g, ' ');

const getItemGenreIds = (item) => {
  const normalizeIds = (ids) => ids
    .map((id) => Number(id))
    .filter((id) => Number.isFinite(id));

  if (Array.isArray(item.genre_ids) && item.genre_ids.length > 0) {
    return normalizeIds(item.genre_ids);
  }
  if (Array.isArray(item.genres) && item.genres.length > 0) {
    return normalizeIds(item.genres.map((genre) => genre?.id));
  }
  return [];
};

const loadProviderCache = () => {
  if (providerCacheState.loaded || typeof window === 'undefined') {
    return providerCacheState.data;
  }
  try {
    const stored = window.localStorage.getItem(PROVIDER_CACHE_KEY);
    providerCacheState.data = stored ? JSON.parse(stored) : {};
  } catch (error) {
    providerCacheState.data = {};
  }
  providerCacheState.loaded = true;
  return providerCacheState.data;
};

const persistProviderCache = () => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(PROVIDER_CACHE_KEY, JSON.stringify(providerCacheState.data));
  } catch (error) {
    // Ignore cache write failures (storage quota, privacy mode).
  }
};

const getCachedWatchProviders = async (mediaType, id) => {
  if (typeof window === 'undefined') {
    return getWatchProviders(mediaType, id);
  }

  const cache = loadProviderCache();
  const cacheKey = `${mediaType}:${id}`;
  const cached = cache[cacheKey];
  if (cached && Date.now() - cached.fetchedAt < PROVIDER_CACHE_TTL) {
    return cached.data;
  }

  const data = await getWatchProviders(mediaType, id);
  cache[cacheKey] = {
    fetchedAt: Date.now(),
    data,
  };
  persistProviderCache();
  return data;
};

const indexProviders = (data, region) => {
  const regionData = data?.results?.[region];
  const providersById = new Map();

  if (!regionData) {
    return { providersById, providers: [] };
  }

  PROVIDER_BUCKETS.forEach((type) => {
    const list = regionData[type] || [];
    list.forEach((provider) => {
      if (!provider?.provider_id) return;
      const existing = providersById.get(provider.provider_id) || {
        ...provider,
        types: new Set(),
      };
      existing.types.add(type);
      providersById.set(provider.provider_id, existing);
    });
  });

  return { providersById, providers: Array.from(providersById.values()) };
};

const needsMetadata = (item) => {
  const hasGenres = getItemGenreIds(item).length > 0;
  const hasPopularity = item.popularity !== undefined && item.popularity !== null;
  const hasVoteAverage = item.vote_average !== undefined && item.vote_average !== null;
  const hasTitle = Boolean(item.title || item.name);
  const hasDate = Boolean(item.release_date || item.first_air_date);
  return !(hasGenres && hasPopularity && hasVoteAverage && hasTitle && hasDate);
};

const extractMetadata = (data) => {
  if (!data) return {};
  const genreIds = Array.isArray(data.genres)
    ? data.genres.map((genre) => Number(genre.id)).filter((id) => Number.isFinite(id))
    : [];
  const popularity = normalizeNumber(data.popularity);
  const voteAverage = normalizeNumber(data.vote_average);
  const title = data.title || data.name;
  const name = data.name || data.title;
  const releaseDate = data.release_date || data.first_air_date;
  const posterPath = data.poster_path;

  return {
    ...(genreIds.length > 0 ? { genre_ids: genreIds } : {}),
    ...(popularity !== undefined ? { popularity } : {}),
    ...(voteAverage !== undefined ? { vote_average: voteAverage } : {}),
    ...(title ? { title } : {}),
    ...(name ? { name } : {}),
    ...(releaseDate ? { release_date: releaseDate } : {}),
    ...(posterPath ? { poster_path: posterPath } : {}),
  };
};

export default function Watchlist() {
  const [searchParams, setSearchParams] = useSearchParams();
  const mediaType = searchParams.get('mediaType') || 'movie';
  const listParam = searchParams.get('list');
  const {
    lists,
    getListItems,
    addItemToList,
    removeItemFromList,
    reorderItems,
    updateItemDetails,
    isLoading,
    warning,
    source,
    createList,
    canManageLists,
  } = useLists();
  const [sortBy, setSortBy] = useState('manual');
  const [filterQuery, setFilterQuery] = useState('');
  const [yearFilter, setYearFilter] = useState('');
  const [minRating, setMinRating] = useState('');
  const [genreFilters, setGenreFilters] = useState([]);
  const [providerFilters, setProviderFilters] = useState([]);
  const [providerTypeFilters, setProviderTypeFilters] = useState([]);
  const [providerRegion, setProviderRegion] = useState(() => inferProviderRegion());
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
  const [showAllFilterChips, setShowAllFilterChips] = useState(false);
  const [isSortMenuOpen, setIsSortMenuOpen] = useState(false);
  const [isReorderMode, setIsReorderMode] = useState(false);
  const [selectionMode, setSelectionMode] = useState(false);
  const [deleteMode, setDeleteMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [moveTargetId, setMoveTargetId] = useState('');
  const [activeId, setActiveId] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isAnnotationModalOpen, setIsAnnotationModalOpen] = useState(false);
  const [annotationTarget, setAnnotationTarget] = useState(null);
  const [draftNotes, setDraftNotes] = useState('');
  const [draftTags, setDraftTags] = useState([]);
  const [tagInput, setTagInput] = useState('');
  const [tagInputError, setTagInputError] = useState('');
  const [annotationError, setAnnotationError] = useState('');
  const [isSavingAnnotations, setIsSavingAnnotations] = useState(false);
  const annotationInitialRef = useRef({ notes: '', tags: [] });
  const tagInputRef = useRef(null);
  const metadataEnrichedRef = useRef(new Set());
  const sortButtonRef = useRef(null);
  const sortMenuRef = useRef(null);
  const reorderSnapshotRef = useRef(null);

  const activeList = useMemo(() => {
    if (listParam) {
      const byId = lists.find((list) => list.id === listParam);
      if (byId) return byId;
      const byType = lists.find((list) => list.type === listParam);
      if (byType) return byType;
      const byName = lists.find((list) => list.name.toLowerCase() === listParam.toLowerCase());
      if (byName) return byName;
    }
    return lists.find((list) => list.type === 'watchlist') || lists[0] || null;
  }, [listParam, lists]);

  useEffect(() => {
    if (!activeList) return;
    if (activeList.id !== listParam) {
      const nextParams = new URLSearchParams();
      nextParams.set('list', activeList.id);
      nextParams.set('mediaType', mediaType);
      setSearchParams(nextParams, { replace: true });
    }
  }, [activeList, listParam, mediaType, setSearchParams]);

  const movieItems = activeList ? getListItems(activeList.id, 'movie') : [];
  const tvItems = activeList ? getListItems(activeList.id, 'tv') : [];

  const tabs = [
    { id: 'movie', label: 'Movies', count: movieItems.length },
    { id: 'tv', label: 'TV Shows', count: tvItems.length }
  ];

  const currentItems = mediaType === 'movie' ? movieItems : tvItems;
  const { data: genreData } = useQuery({
    queryKey: ['genreList', mediaType],
    queryFn: () => getGenreList(mediaType),
    staleTime: 1000 * 60 * 60 * 24,
  });
  const genreOptions = useMemo(
    () => (genreData?.genres || []).slice().sort((a, b) => a.name.localeCompare(b.name)),
    [genreData]
  );
  const { data: regionData } = useQuery({
    queryKey: ['watchProviderRegions'],
    queryFn: () => getWatchProviderRegions(),
    staleTime: 1000 * 60 * 60 * 24,
  });
  const regionOptions = useMemo(
    () => (regionData?.results || [])
      .slice()
      .sort((a, b) => a.english_name.localeCompare(b.english_name)),
    [regionData]
  );
  const providerQueries = useQueries({
    queries: currentItems.map((item) => ({
      queryKey: ['watchProviders', mediaType, item.id],
      queryFn: () => getCachedWatchProviders(mediaType, item.id),
      enabled: currentItems.length > 0,
      staleTime: 1000 * 60 * 60 * 12,
    })),
  });
  const providerById = useMemo(() => {
    const map = new Map();
    providerQueries.forEach((query, index) => {
      const item = currentItems[index];
      if (!item) return;
      map.set(item.id, indexProviders(query.data, providerRegion));
    });
    return map;
  }, [providerQueries, currentItems, providerRegion]);
  const availableProviders = useMemo(() => {
    const map = new Map();
    providerById.forEach((providers) => {
      providers.providers.forEach((provider) => {
        map.set(provider.provider_id, provider);
      });
    });
    return Array.from(map.values()).sort((a, b) => a.provider_name.localeCompare(b.provider_name));
  }, [providerById]);
  const providersLoading = providerQueries.some((query) => query.isLoading);
  const providersErrored = providerQueries.some((query) => query.isError);
  const itemsNeedingMetadata = useMemo(
    () => currentItems.filter(needsMetadata).slice(0, MAX_METADATA_FETCH),
    [currentItems]
  );
  const metadataQueries = useQueries({
    queries: itemsNeedingMetadata.map((item) => ({
      queryKey: ['watchlist-metadata', mediaType, item.id],
      queryFn: () => (mediaType === 'movie' ? getMovieDetails(item.id) : getTVShowDetails(item.id)),
      enabled: itemsNeedingMetadata.length > 0,
      staleTime: 1000 * 60 * 60 * 12,
    })),
  });
  const visibleWatchlist = useMemo(() => {
    const normalizedQuery = filterQuery.trim().toLowerCase();
    const normalizedYear = yearFilter.trim();
    const minRatingValue = Number(minRating);
    const genreFilterValues = genreFilters
      .map((value) => Number(value))
      .filter((value) => Number.isFinite(value));
    const providerFilterValues = providerFilters
      .map((value) => Number(value))
      .filter((value) => Number.isFinite(value));
    const providerTypeFilterValues = providerTypeFilters;

    const filtered = currentItems.filter((item) => {
      const title = (item.title || item.name || '').toLowerCase();
      if (normalizedQuery && !title.includes(normalizedQuery)) {
        return false;
      }

      if (normalizedYear) {
        const dateValue = item.release_date || item.first_air_date || '';
        const yearValue = dateValue ? new Date(dateValue).getFullYear().toString() : '';
        if (yearValue !== normalizedYear) {
          return false;
        }
      }

      if (!Number.isNaN(minRatingValue) && minRatingValue > 0) {
        const rating = Number(item.vote_average || 0);
        if (rating < minRatingValue) {
          return false;
        }
      }

      if (genreFilterValues.length > 0) {
        const itemGenres = getItemGenreIds(item);
        const hasGenre = genreFilterValues.some((genreId) => itemGenres.includes(genreId));
        if (!hasGenre) {
          return false;
        }
      }

      if (providerFilterValues.length > 0 || providerTypeFilterValues.length > 0) {
        const providers = providerById.get(item.id);
        if (!providers || providers.providersById.size === 0) {
          return false;
        }

        if (providerFilterValues.length > 0) {
          const matchesProvider = providerFilterValues.some((providerId) => {
            const provider = providers.providersById.get(providerId);
            if (!provider) return false;
            if (providerTypeFilterValues.length === 0) return true;
            return providerTypeFilterValues.some((type) => provider.types.has(type));
          });
          if (!matchesProvider) {
            return false;
          }
        } else if (providerTypeFilterValues.length > 0) {
          const matchesType = Array.from(providers.providersById.values()).some((provider) => (
            providerTypeFilterValues.some((type) => provider.types.has(type))
          ));
          if (!matchesType) {
            return false;
          }
        }
      }

      return true;
    });

    if (sortBy === 'title') {
      return [...filtered].sort((a, b) => {
        const aTitle = (a.title || a.name || '').toLowerCase();
        const bTitle = (b.title || b.name || '').toLowerCase();
        return aTitle.localeCompare(bTitle);
      });
    }

    if (sortBy === 'release') {
      return [...filtered].sort((a, b) => {
        const aDate = new Date(a.release_date || a.first_air_date || 0).getTime();
        const bDate = new Date(b.release_date || b.first_air_date || 0).getTime();
        return bDate - aDate;
      });
    }

    if (sortBy === 'recent') {
      return [...filtered].sort((a, b) => {
        const aDate = new Date(a.added_at || 0).getTime();
        const bDate = new Date(b.added_at || 0).getTime();
        return bDate - aDate;
      });
    }

    if (sortBy === 'popularity') {
      return [...filtered].sort((a, b) => {
        const aScore = Number(a.popularity || 0);
        const bScore = Number(b.popularity || 0);
        return bScore - aScore;
      });
    }

    return filtered;
  }, [
    currentItems,
    filterQuery,
    genreFilters,
    minRating,
    providerFilters,
    providerById,
    providerTypeFilters,
    sortBy,
    yearFilter,
  ]);

  const activeSortLabel = SORT_OPTIONS.find((option) => option.id === sortBy)?.label || 'Manual';
  const iconButtonBase = 'inline-flex items-center justify-center h-9 w-9 rounded-lg border text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500';
  const iconButtonDefault = 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700';
  const iconButtonActive = 'bg-primary-600 text-white border-primary-600';
  const iconButtonDanger = 'border-red-200 text-red-600 hover:bg-red-50 dark:border-red-900/60 dark:text-red-300 dark:hover:bg-red-900/20';
  const toolbarButtonBase = 'inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500';
  const toolbarButtonDefault = 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700';
  const toolbarButtonActive = 'bg-primary-600 text-white border-primary-600';
  const chipBase = 'inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs';
  const chipActive = 'border-primary-200 bg-primary-50 text-primary-700 dark:border-primary-900/60 dark:bg-primary-900/30 dark:text-primary-200';
  const chipNeutral = 'border-gray-200 bg-white text-gray-600 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300';

  const isSelecting = selectionMode || deleteMode;
  const selectedItems = useMemo(
    () => currentItems.filter((item) => selectedIds.has(item.id)),
    [currentItems, selectedIds]
  );
  const tagLimitReached = draftTags.length >= TAG_LIMIT;
  const notesRemaining = Math.max(0, NOTES_MAX_LENGTH - draftNotes.length);
  const hasTagInputError = Boolean(tagInputError);
  const hasAnnotationChanges = useMemo(() => {
    if (!annotationTarget) return false;
    const initialNotes = normalizeNotes(annotationInitialRef.current.notes);
    const notesChanged = normalizeNotes(draftNotes) !== initialNotes;
    const tagsChanged = !tagsEqual(draftTags, annotationInitialRef.current.tags);
    return notesChanged || tagsChanged;
  }, [annotationTarget, draftNotes, draftTags]);
  const captureReorderSnapshot = () => {
    if (!activeList) return;
    reorderSnapshotRef.current = {
      listId: activeList.id,
      mediaType,
      items: currentItems.map((item, index) => ({
        ...item,
        position: index,
      })),
    };
  };
  const exitReorderMode = ({ revert = false } = {}) => {
    const snapshot = reorderSnapshotRef.current;
    if (revert && snapshot && snapshot.listId === activeList?.id && snapshot.mediaType === mediaType) {
      reorderItems(snapshot.listId, snapshot.mediaType, snapshot.items, { persist: true });
    }
    reorderSnapshotRef.current = null;
    setIsReorderMode(false);
  };
  const toggleGenreFilter = (genreId) => {
    setGenreFilters((prev) => (
      prev.includes(genreId)
        ? prev.filter((value) => value !== genreId)
        : [...prev, genreId]
    ));
  };
  const toggleProviderFilter = (providerId) => {
    setProviderFilters((prev) => (
      prev.includes(providerId)
        ? prev.filter((value) => value !== providerId)
        : [...prev, providerId]
    ));
  };
  const toggleProviderTypeFilter = (type) => {
    setProviderTypeFilters((prev) => (
      prev.includes(type)
        ? prev.filter((value) => value !== type)
        : [...prev, type]
    ));
  };
  const clearFilters = () => {
    setFilterQuery('');
    setYearFilter('');
    setMinRating('');
    setGenreFilters([]);
    setProviderFilters([]);
    setProviderTypeFilters([]);
    setShowAllFilterChips(false);
  };

  const genreNameById = useMemo(
    () => new Map(genreOptions.map((genre) => [genre.id, genre.name])),
    [genreOptions]
  );
  const providerNameById = useMemo(
    () => new Map(availableProviders.map((provider) => [Number(provider.provider_id), provider.provider_name])),
    [availableProviders]
  );
  const regionNameByCode = useMemo(() => {
    const map = new Map(regionOptions.map((region) => [region.iso_3166_1, region.english_name]));
    if (providerRegion && !map.has(providerRegion)) {
      map.set(providerRegion, providerRegion);
    }
    return map;
  }, [providerRegion, regionOptions]);
  const providerTypeLabels = useMemo(
    () => new Map(PROVIDER_TYPE_OPTIONS.map((option) => [option.id, option.label])),
    []
  );
  const filterChips = useMemo(() => {
    const chips = [];
    const trimmedQuery = filterQuery.trim();

    if (trimmedQuery) {
      chips.push({
        id: 'search',
        label: `Search: ${trimmedQuery}`,
        onRemove: () => setFilterQuery(''),
      });
    }

    if (yearFilter.trim()) {
      chips.push({
        id: 'year',
        label: `Year: ${yearFilter.trim()}`,
        onRemove: () => setYearFilter(''),
      });
    }

    if (minRating.trim()) {
      chips.push({
        id: 'rating',
        label: `Min rating: ${minRating.trim()}`,
        onRemove: () => setMinRating(''),
      });
    }

    genreFilters.forEach((genreId) => {
      chips.push({
        id: `genre-${genreId}`,
        label: genreNameById.get(genreId) || `Genre ${genreId}`,
        onRemove: () => setGenreFilters((prev) => prev.filter((value) => value !== genreId)),
      });
    });

    providerFilters.forEach((providerId) => {
      chips.push({
        id: `provider-${providerId}`,
        label: providerNameById.get(providerId) || `Provider ${providerId}`,
        onRemove: () => setProviderFilters((prev) => prev.filter((value) => value !== providerId)),
      });
    });

    providerTypeFilters.forEach((type) => {
      chips.push({
        id: `provider-type-${type}`,
        label: `Type: ${providerTypeLabels.get(type) || type}`,
        onRemove: () => setProviderTypeFilters((prev) => prev.filter((value) => value !== type)),
      });
    });

    if ((providerFilters.length > 0 || providerTypeFilters.length > 0) && providerRegion) {
      chips.push({
        id: 'region',
        label: `Region: ${regionNameByCode.get(providerRegion) || providerRegion}`,
        onRemove: () => setProviderRegion(inferProviderRegion()),
      });
    }

    return chips;
  }, [
    filterQuery,
    yearFilter,
    minRating,
    genreFilters,
    providerFilters,
    providerTypeFilters,
    providerRegion,
    genreNameById,
    providerNameById,
    providerTypeLabels,
    regionNameByCode,
  ]);
  const filterCount = filterChips.length;
  const sortChip = sortBy !== 'manual'
    ? {
        label: `Sort: ${activeSortLabel}`,
        onRemove: () => setSortBy('manual'),
      }
    : null;
  const maxVisibleChips = 8;
  const hasOverflowChips = filterChips.length > maxVisibleChips;
  const visibleFilterChips = showAllFilterChips || !hasOverflowChips
    ? filterChips
    : filterChips.slice(0, maxVisibleChips);
  const hiddenFilterCount = hasOverflowChips ? filterChips.length - maxVisibleChips : 0;
  const handleTabChange = (newMediaType) => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set('mediaType', newMediaType);
    setSearchParams(nextParams);
  };

  const handleListChange = (listId) => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set('list', listId);
    if (!nextParams.get('mediaType')) {
      nextParams.set('mediaType', 'movie');
    }
    setSearchParams(nextParams);
  };

  const handleCreateList = async () => {
    const name = window.prompt('New list name');
    if (!name) return;
    try {
      const newList = await createList(name);
      if (newList?.id) {
        handleListChange(newList.id);
      }
    } catch (error) {
      // Surface errors as a warning banner, similar to sync failures.
    }
  };

  useEffect(() => {
    setSelectedIds(new Set());
    setSelectionMode(false);
    setDeleteMode(false);
    setIsDeleteModalOpen(false);
    setIsAnnotationModalOpen(false);
    setAnnotationTarget(null);
    setDraftNotes('');
    setDraftTags([]);
    setTagInput('');
    setTagInputError('');
    setAnnotationError('');
    setIsSavingAnnotations(false);
    setMoveTargetId('');
    setActiveId(null);
    metadataEnrichedRef.current = new Set();
  }, [activeList?.id, mediaType]);

  useEffect(() => {
    if (!activeList) return;
    metadataQueries.forEach((query, index) => {
      if (!query.isSuccess) return;
      const item = itemsNeedingMetadata[index];
      if (!item) return;
      if (metadataEnrichedRef.current.has(item.id)) return;
      const updates = extractMetadata(query.data);
      if (Object.keys(updates).length === 0) return;
      updateItemDetails(activeList.id, item.id, mediaType, updates).catch(() => {});
      metadataEnrichedRef.current.add(item.id);
    });
  }, [activeList, itemsNeedingMetadata, metadataQueries, mediaType, updateItemDetails]);

  useEffect(() => {
    if (!isSortMenuOpen) return undefined;
    const handleClickOutside = (event) => {
      const target = event.target;
      if (sortMenuRef.current?.contains(target)) return;
      if (sortButtonRef.current?.contains(target)) return;
      setIsSortMenuOpen(false);
    };
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setIsSortMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isSortMenuOpen]);

  useEffect(() => {
    if (sortBy !== 'manual') {
      setIsReorderMode(false);
    }
  }, [sortBy]);

  useEffect(() => {
    if (
      filterQuery.trim()
      || yearFilter.trim()
      || minRating.trim()
      || genreFilters.length > 0
      || providerFilters.length > 0
      || providerTypeFilters.length > 0
    ) {
      setIsReorderMode(false);
    }
  }, [filterQuery, genreFilters, minRating, providerFilters, providerTypeFilters, yearFilter]);

  useEffect(() => {
    setGenreFilters([]);
    setProviderFilters([]);
    setProviderTypeFilters([]);
  }, [mediaType]);

  useEffect(() => {
    setProviderFilters([]);
  }, [providerRegion]);

  useEffect(() => {
    if (!isAnnotationModalOpen) return;
    tagInputRef.current?.focus();
  }, [isAnnotationModalOpen]);

  const hasFilters = Boolean(
    filterQuery.trim()
    || yearFilter.trim()
    || minRating.trim()
    || genreFilters.length > 0
    || providerFilters.length > 0
    || providerTypeFilters.length > 0
  );
  const canReorder = isReorderMode
    && sortBy === 'manual'
    && !hasFilters;
  const canDrag = canReorder && !isSelecting;
  const canEditAnnotations = !canDrag && !isSelecting;
  const hasMissingRemoteIds = currentItems.some((item) => !item.list_item_id);
  const reorderDisabled = sortBy !== 'manual' || hasFilters || (source === 'remote' && hasMissingRemoteIds);

  useEffect(() => {
    if (canDrag) return;
    setActiveId(null);
  }, [canDrag]);

  const toggleSelection = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
  };

  const resetAnnotationDraft = () => {
    setIsAnnotationModalOpen(false);
    setAnnotationTarget(null);
    setDraftNotes('');
    setDraftTags([]);
    setTagInput('');
    setTagInputError('');
    setAnnotationError('');
    setIsSavingAnnotations(false);
  };

  const openAnnotationEditor = (item) => {
    if (!activeList) return;
    const notesValue = normalizeNotes(item.notes);
    const tagsValue = normalizeTags(item.tags);
    annotationInitialRef.current = {
      notes: notesValue,
      tags: tagsValue,
    };
    setDraftNotes(notesValue);
    setDraftTags(tagsValue);
    setTagInput('');
    setTagInputError('');
    setAnnotationError('');
    setAnnotationTarget({
      listId: activeList.id,
      itemId: item.id,
      mediaType,
      title: item.title || item.name || 'Item',
    });
    setIsAnnotationModalOpen(true);
  };

  const closeAnnotationEditor = () => {
    if (hasAnnotationChanges) {
      const confirmClose = window.confirm('Discard unsaved notes and tags?');
      if (!confirmClose) return;
    }
    resetAnnotationDraft();
  };

  const buildTagsFromInput = (currentTags, value) => {
    const tokens = value
      .split(TAG_SPLIT_REGEX)
      .map((token) => normalizeTagValue(token))
      .filter(Boolean);

    if (tokens.length === 0) {
      return { nextTags: currentTags, errorMessage: '' };
    }

    let nextTags = [...currentTags];
    let errorMessage = '';

    tokens.forEach((token) => {
      if (nextTags.length >= TAG_LIMIT) {
        errorMessage = `Up to ${TAG_LIMIT} tags allowed.`;
        return;
      }
      if (token.length > TAG_MAX_LENGTH) {
        errorMessage = `Tags must be ${TAG_MAX_LENGTH} characters or fewer.`;
        return;
      }
      const key = token.toLowerCase();
      if (nextTags.some((tag) => tag.toLowerCase() === key)) return;
      nextTags.push(token);
    });

    return { nextTags, errorMessage };
  };

  const commitTagInput = (value) => {
    const { nextTags, errorMessage } = buildTagsFromInput(draftTags, value);
    if (!tagsEqual(nextTags, draftTags)) {
      setDraftTags(nextTags);
    }
    setTagInputError(errorMessage);
  };

  const handleTagInputKeyDown = (event) => {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault();
      commitTagInput(tagInput);
      setTagInput('');
      return;
    }
    if (event.key === 'Backspace' && !tagInput && draftTags.length > 0) {
      event.preventDefault();
      setDraftTags(draftTags.slice(0, -1));
      setTagInputError('');
    }
  };

  const removeTagAtIndex = (index) => {
    setDraftTags(draftTags.filter((_, idx) => idx !== index));
    setTagInputError('');
  };

  const handleSaveAnnotations = async () => {
    if (!annotationTarget) return;
    let nextTags = draftTags;
    if (tagInput.trim()) {
      const { nextTags: updatedTags, errorMessage } = buildTagsFromInput(draftTags, tagInput);
      nextTags = updatedTags;
      setDraftTags(updatedTags);
      setTagInput('');
      setTagInputError(errorMessage);
      if (errorMessage) return;
    }
    setIsSavingAnnotations(true);
    setAnnotationError('');
    const notesValue = normalizeNotes(draftNotes);
    const tagsValue = normalizeTags(nextTags);
    try {
      await updateItemDetails(annotationTarget.listId, annotationTarget.itemId, annotationTarget.mediaType, {
        notes: notesValue,
        tags: tagsValue,
      });
      resetAnnotationDraft();
    } catch (error) {
      setAnnotationError(error?.message || 'Unable to save notes and tags.');
    } finally {
      setIsSavingAnnotations(false);
    }
  };

  const handleAnnotationKeyDown = (event) => {
    if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
      event.preventDefault();
      if (isSavingAnnotations || hasTagInputError || !hasAnnotationChanges) return;
      handleSaveAnnotations();
    }
  };

  const floatingMode = deleteMode ? 'delete' : isReorderMode ? 'reorder' : '';
  const handleFloatingConfirm = () => {
    if (deleteMode) {
      handleDeletePrompt();
      return;
    }
    if (isReorderMode) {
      exitReorderMode();
    }
  };
  const handleFloatingCancel = () => {
    if (deleteMode) {
      exitDeleteMode();
      return;
    }
    if (isReorderMode) {
      exitReorderMode({ revert: true });
    }
  };

  const exitDeleteMode = () => {
    setDeleteMode(false);
    setIsDeleteModalOpen(false);
    clearSelection();
  };

  const handleDeletePrompt = () => {
    if (selectedIds.size === 0) return;
    setIsDeleteModalOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (!activeList || selectedItems.length === 0) return;
    selectedItems.forEach((item) => {
      removeItemFromList(activeList.id, item.id, mediaType);
    });
    exitDeleteMode();
  };

  const handleMoveSelected = () => {
    if (!activeList || !moveTargetId) return;
    const targetList = lists.find((list) => list.id === moveTargetId);
    if (!targetList) return;

    currentItems.forEach((item) => {
      if (selectedIds.has(item.id)) {
        addItemToList(targetList.id, item, mediaType);
        removeItemFromList(activeList.id, item.id, mediaType);
      }
    });
    clearSelection();
    setSelectionMode(false);
    setMoveTargetId('');
  };
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragStart = ({ active }) => {
    if (!canDrag) return;
    setActiveId(active.id);
  };

  const handleDragCancel = () => {
    setActiveId(null);
  };

  const handleDragEnd = ({ active, over }) => {
    setActiveId(null);
    if (!canDrag || !activeList || !over) return;
    if (active.id === over.id) return;
    const oldIndex = currentItems.findIndex((item) => item.id === active.id);
    const newIndex = currentItems.findIndex((item) => item.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    const nextItems = arrayMove(currentItems, oldIndex, newIndex);
    const withPositions = nextItems.map((item, index) => ({
      ...item,
      position: index,
    }));
    reorderItems(activeList.id, mediaType, withPositions, { persist: true });
  };

  const activeItem = useMemo(() => {
    if (activeId === null) return null;
    return currentItems.find((item) => item.id === activeId) || null;
  }, [activeId, currentItems]);

  const renderAnnotationSummary = (item) => {
    const tags = normalizeTags(item.tags);
    const notesPreview = formatNotesPreview(item.notes);
    const hasContent = tags.length > 0 || Boolean(notesPreview);
    const visibleTags = tags.slice(0, TAG_PREVIEW_COUNT);
    const extraCount = tags.length - visibleTags.length;
    const summaryClassName = `w-full rounded-lg border px-3 py-2 text-left text-xs transition ${
      hasContent
        ? 'border-gray-200/80 bg-white/70 text-gray-600 dark:border-gray-800/80 dark:bg-gray-900/60 dark:text-gray-300'
        : 'border-dashed border-gray-200/80 bg-white/40 text-gray-400 dark:border-gray-800/70 dark:bg-gray-900/30 dark:text-gray-500'
    } ${canEditAnnotations ? 'hover:border-gray-300 hover:bg-white dark:hover:border-gray-700' : 'opacity-60 cursor-default pointer-events-none'}`;

    return (
      <button
        type="button"
        className={summaryClassName}
        onClick={() => openAnnotationEditor(item)}
        disabled={!canEditAnnotations}
        aria-label={`${hasContent ? 'Edit' : 'Add'} notes and tags for ${item.title || item.name || 'item'}`}
      >
        {hasContent ? (
          <>
            {visibleTags.length > 0 && (
              <div className="flex flex-wrap items-center gap-1">
                {visibleTags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-semibold text-gray-700 dark:bg-gray-800 dark:text-gray-200"
                  >
                    {tag}
                  </span>
                ))}
                {extraCount > 0 && (
                  <span className="inline-flex items-center rounded-full border border-gray-200 px-2 py-0.5 text-[11px] font-semibold text-gray-500 dark:border-gray-700 dark:text-gray-300">
                    +{extraCount}
                  </span>
                )}
              </div>
            )}
            {notesPreview && (
              <p className="mt-1 line-clamp-1 text-xs text-gray-500 dark:text-gray-400">
                {notesPreview}
              </p>
            )}
          </>
        ) : (
          <div className="flex items-center gap-2 text-[11px] font-semibold">
            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-gray-200 text-gray-400 dark:border-gray-700 dark:text-gray-500">
              +
            </span>
            <span>Add notes or tags</span>
          </div>
        )}
      </button>
    );
  };

  const sortableIds = useMemo(
    () => visibleWatchlist.map((item) => item.id),
    [visibleWatchlist]
  );

  const activeListCount = currentItems.length;
  const deletePreviewItems = selectedItems.slice(0, 10);
  const remainingDeleteCount = Math.max(selectedItems.length - deletePreviewItems.length, 0);
  const wrapperClass = `${isReorderMode ? 'reorder-mode' : ''}${activeId !== null ? ' dragging' : ''}`.trim();

  return (
    <div className={wrapperClass}>
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            My Lists
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {activeList?.name || 'List'} · {activeListCount} {mediaType === 'movie' ? 'movies' : 'TV shows'}
          </p>
        </div>
        <span
          className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
            source === 'remote'
              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
              : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300'
          }`}
        >
          {source === 'remote' ? 'Synced' : 'Local'}
        </span>
      </div>

      {warning && (
        <div className="mb-6 rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-800 dark:border-yellow-900/50 dark:bg-yellow-900/30 dark:text-yellow-200">
          {warning}
        </div>
      )}

      <div className="mb-6 flex flex-wrap items-center gap-2">
        {lists.map((list) => {
          const isActive = list.id === activeList?.id;
          return (
            <button
              key={list.id}
              type="button"
              onClick={() => handleListChange(list.id)}
              className={`px-3 py-1 rounded-full text-sm font-semibold transition-colors ${
                isActive
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              {list.name}
            </button>
          );
        })}
        {canManageLists && (
          <Button variant="secondary" size="sm" onClick={handleCreateList}>
            New list
          </Button>
        )}
      </div>

      <div className="mb-8">
        <TabNavigation tabs={tabs} activeTab={mediaType} onTabChange={handleTabChange} />
      </div>

      <div className="mb-8 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white/90 dark:bg-gray-900/70 p-4 md:p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setIsFilterPanelOpen((prev) => !prev)}
              className={`${toolbarButtonBase} ${(isFilterPanelOpen || filterCount > 0) ? toolbarButtonActive : toolbarButtonDefault}`}
              aria-expanded={isFilterPanelOpen}
              aria-controls="watchlist-filter-panel"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h18M6 12h12M10 20h4" />
              </svg>
              <span>Filter</span>
              {filterCount > 0 && (
                <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs font-semibold">
                  {filterCount}
                </span>
              )}
              <svg
                className={`h-4 w-4 transition-transform ${isFilterPanelOpen ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 9l6 6 6-6" />
              </svg>
            </button>

            <div className="relative">
              <button
                ref={sortButtonRef}
                type="button"
                onClick={() => setIsSortMenuOpen((prev) => !prev)}
                className={`${toolbarButtonBase} ${(isSortMenuOpen || sortBy !== 'manual') ? toolbarButtonActive : toolbarButtonDefault}`}
                aria-haspopup="menu"
                aria-expanded={isSortMenuOpen}
                aria-label={`Sort by ${activeSortLabel}`}
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4.5h13.5m-13.5 6h9m-9 6h5.25m6-10.5v9m0 0l-3-3m3 3l3-3" />
                </svg>
                <span>Sort</span>
                <span className={`text-xs ${sortBy !== 'manual' ? 'text-white/80' : 'text-gray-500 dark:text-gray-300'}`}>
                  {activeSortLabel}
                </span>
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 9l6 6 6-6" />
                </svg>
              </button>
              <div
                ref={sortMenuRef}
                role="menu"
                className={`absolute left-0 z-20 mt-2 w-48 origin-top-left rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-lg transition-all duration-150 ease-out ${isSortMenuOpen ? 'scale-100 opacity-100 translate-y-0' : 'scale-95 opacity-0 -translate-y-1 pointer-events-none'}`}
              >
                <div className="py-1">
                  {SORT_OPTIONS.map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      role="menuitemradio"
                      aria-checked={sortBy === option.id}
                      onClick={() => {
                        setSortBy(option.id);
                        setIsSortMenuOpen(false);
                      }}
                      className={`flex w-full items-center justify-between px-3 py-2 text-sm ${sortBy === option.id ? 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100' : 'text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
                    >
                      <span>{option.label}</span>
                      {sortBy === option.id && (
                        <svg className="h-4 w-4 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              className={`${iconButtonBase} ${isReorderMode ? iconButtonActive : iconButtonDefault} ${reorderDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
              onClick={() => {
                if (isReorderMode) {
                  exitReorderMode();
                  return;
                }
                captureReorderSnapshot();
                setIsReorderMode(true);
                setSelectionMode(false);
                setDeleteMode(false);
              }}
              disabled={reorderDisabled}
              aria-label={isReorderMode ? 'Disable reorder' : 'Enable reorder'}
              title={isReorderMode ? 'Disable reorder' : 'Enable reorder'}
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7l4-4 4 4M12 3v18m0 0l-4-4m4 4l4-4" />
              </svg>
            </button>

            <button
              type="button"
              className={`${iconButtonBase} ${selectionMode ? iconButtonActive : iconButtonDefault}`}
              onClick={() => {
                setSelectionMode((prev) => !prev);
                exitReorderMode();
                setDeleteMode(false);
              }}
              aria-label={selectionMode ? 'Exit selection mode' : 'Enter selection mode'}
              title={selectionMode ? 'Exit selection mode' : 'Enter selection mode'}
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <rect x="4" y="4" width="16" height="16" rx="2" strokeWidth={2} />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12l3 3 5-5" />
              </svg>
            </button>

            <button
              type="button"
              className={`${iconButtonBase} ${iconButtonDanger} ${deleteMode ? 'bg-red-50 dark:bg-red-900/30' : ''}`}
              onClick={() => {
                clearSelection();
                setDeleteMode(true);
                setSelectionMode(false);
                exitReorderMode();
              }}
              aria-label="Delete items"
              title="Delete items"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 7h12M9 7V5h6v2M10 11v6M14 11v6M5 7l1 12h12l1-12" />
              </svg>
            </button>
          </div>
        </div>

        {(filterChips.length > 0 || sortChip) && (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {sortChip && (
              <div className={`${chipBase} ${chipNeutral}`}>
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7l4-4 4 4M12 3v18" />
                </svg>
                <span>{sortChip.label}</span>
                <button
                  type="button"
                  onClick={sortChip.onRemove}
                  className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-200"
                  aria-label="Reset sort"
                >
                  <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            )}

            {visibleFilterChips.map((chip) => (
              <div key={chip.id} className={`${chipBase} ${chipActive}`}>
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>{chip.label}</span>
                <button
                  type="button"
                  onClick={chip.onRemove}
                  className="text-primary-700 hover:text-primary-900 dark:text-primary-200 dark:hover:text-white"
                  aria-label={`Remove ${chip.label}`}
                >
                  <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}

            {hiddenFilterCount > 0 && !showAllFilterChips && (
              <button
                type="button"
                onClick={() => setShowAllFilterChips(true)}
                className={`${chipBase} ${chipNeutral}`}
              >
                +{hiddenFilterCount} more
              </button>
            )}

            {hiddenFilterCount > 0 && showAllFilterChips && (
              <button
                type="button"
                onClick={() => setShowAllFilterChips(false)}
                className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                Show less
              </button>
            )}

            {filterChips.length > 0 && (
              <button
                type="button"
                onClick={clearFilters}
                className="text-xs font-semibold text-primary-600 hover:text-primary-700"
              >
                Clear
              </button>
            )}
          </div>
        )}

        <div
          id="watchlist-filter-panel"
          className={`mt-5 grid gap-6 overflow-hidden transition-all duration-500 ease-in-out ${isFilterPanelOpen ? 'max-h-[1200px] opacity-100 translate-y-0' : 'max-h-0 opacity-0 -translate-y-2 pointer-events-none'}`}
        >
          <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_120px_140px]">
              <input
                id="watchlist-filter"
                type="text"
                value={filterQuery}
                onChange={(event) => setFilterQuery(event.target.value)}
                placeholder="Search titles"
                aria-label="Search titles"
                className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              <input
                id="watchlist-year"
                type="number"
                inputMode="numeric"
                value={yearFilter}
                onChange={(event) => setYearFilter(event.target.value)}
                placeholder="Year"
                aria-label="Filter by year"
                className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              <input
                id="watchlist-rating"
                type="number"
                step="0.1"
                min="0"
                max="10"
                value={minRating}
                onChange={(event) => setMinRating(event.target.value)}
                placeholder="Min rating"
                aria-label="Minimum rating"
                className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <label className="text-sm text-gray-600 dark:text-gray-400" htmlFor="watchlist-region">
                Region
              </label>
              <select
                id="watchlist-region"
                value={providerRegion}
                onChange={(event) => setProviderRegion(event.target.value)}
                className="w-36 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                {(regionOptions.length > 0 ? regionOptions : [{ iso_3166_1: providerRegion, english_name: providerRegion }])
                  .map((region) => (
                    <option key={region.iso_3166_1} value={region.iso_3166_1}>
                      {region.english_name}
                    </option>
                  ))}
              </select>

              <span className="text-sm text-gray-600 dark:text-gray-400">Provider types</span>
              <div className="flex flex-wrap items-center gap-3">
                {PROVIDER_TYPE_OPTIONS.map((option) => (
                  <label
                    key={option.id}
                    className="inline-flex items-center gap-2 text-xs text-gray-700 dark:text-gray-200"
                  >
                    <input
                      type="checkbox"
                      checked={providerTypeFilters.includes(option.id)}
                      onChange={() => toggleProviderTypeFilter(option.id)}
                      className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span>{option.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50/80 dark:bg-gray-950/40 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">Genres</span>
                  {genreFilters.length > 0 && (
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {genreFilters.length} selected
                    </span>
                  )}
                </div>
                <div className="mt-3 max-h-48 overflow-y-auto pr-1 space-y-2">
                  {genreOptions.length === 0 ? (
                    <p className="text-xs text-gray-500 dark:text-gray-400">No genres available.</p>
                  ) : (
                    genreOptions.map((genre) => (
                      <label
                        key={genre.id}
                        className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200"
                      >
                        <input
                          type="checkbox"
                          checked={genreFilters.includes(genre.id)}
                          onChange={() => toggleGenreFilter(genre.id)}
                          className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                        />
                        <span>{genre.name}</span>
                      </label>
                    ))
                  )}
                </div>
              </div>

              <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50/80 dark:bg-gray-950/40 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">Providers</span>
                  {providersLoading && (
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      Loading...
                    </span>
                  )}
                </div>
                {providersErrored && (
                  <p className="mt-1 text-xs text-red-500 dark:text-red-400">
                    Provider data unavailable.
                  </p>
                )}
                <div className="mt-3 max-h-48 overflow-y-auto pr-1 space-y-2">
                  {availableProviders.length === 0 ? (
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      No providers for this region.
                    </p>
                  ) : (
                    availableProviders.map((provider) => {
                      const providerId = Number(provider.provider_id);
                      return (
                        <label
                          key={provider.provider_id}
                          className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200"
                        >
                          <input
                            type="checkbox"
                            checked={providerFilters.includes(providerId)}
                            onChange={() => toggleProviderFilter(providerId)}
                            className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                          />
                          <span>{provider.provider_name}</span>
                        </label>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </div>
        {reorderDisabled && source === 'remote' && hasMissingRemoteIds && (
          <span className="mt-3 text-xs text-gray-500 dark:text-gray-400">
            Syncing items before reorder…
          </span>
        )}
      </div>

      <FloatingModeActions
        mode={floatingMode}
        onConfirm={handleFloatingConfirm}
        onCancel={handleFloatingCancel}
        confirmDisabled={deleteMode && selectedIds.size === 0}
      />

      {selectionMode && (
        <div className="mb-6 flex flex-wrap items-center gap-2 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {selectedIds.size} selected
          </span>
          <select
            value={moveTargetId}
            onChange={(event) => setMoveTargetId(event.target.value)}
            className="rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-1.5 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">Move to...</option>
            {lists
              .filter((list) => list.id !== activeList?.id)
              .map((list) => (
                <option key={list.id} value={list.id}>
                  {list.name}
                </option>
              ))}
          </select>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={handleMoveSelected}
            disabled={!moveTargetId || selectedIds.size === 0}
          >
            Move
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={clearSelection}
            disabled={selectedIds.size === 0}
          >
            Clear selection
          </Button>
        </div>
      )}

      {isLoading && currentItems.length === 0 ? (
        <MovieGridSkeleton />
      ) : currentItems.length === 0 ? (
        <EmptyState
          title={`No ${mediaType === 'movie' ? 'movies' : 'TV shows'} in ${activeList?.name || 'this list'}`}
          message={`Add ${mediaType === 'movie' ? 'movies' : 'TV shows'} you want to keep handy.`}
        >
          <Link
            to="/"
            className="inline-block mt-4 px-6 py-3 bg-primary-600 hover:bg-primary-700 dark:bg-primary-500 dark:hover:bg-primary-600 text-white rounded-lg transition-colors"
          >
            Explore {mediaType === 'movie' ? 'Movies' : 'TV Shows'}
          </Link>
        </EmptyState>
      ) : visibleWatchlist.length === 0 ? (
        <EmptyState
          title="No matches"
          message="Try a different search or clear the filter."
        />
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragCancel={handleDragCancel}
        >
          <SortableContext items={sortableIds} strategy={rectSortingStrategy}>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
              {visibleWatchlist.map((item) =>
                mediaType === 'movie' ? (
                  <SortableItem
                    key={item.id}
                    id={item.id}
                    disabled={!canDrag}
                    className="flex flex-col gap-2 rounded-xl"
                  >
                    <div className={`selection-card${selectedIds.has(item.id) ? ' selection-card--selected' : ''}`}>
                      {isSelecting && (
                        <SelectionToggle
                          selected={selectedIds.has(item.id)}
                          onToggle={() => toggleSelection(item.id)}
                          label={item.title}
                        />
                      )}
                      {isSelecting && (
                        <button
                          type="button"
                          className="selection-overlay"
                          onClick={() => toggleSelection(item.id)}
                          aria-pressed={selectedIds.has(item.id)}
                          aria-label={`${selectedIds.has(item.id) ? 'Deselect' : 'Select'} ${item.title || 'item'}`}
                        />
                      )}
                      <div className={canDrag ? 'pointer-events-none' : ''}>
                        <MovieCard movie={item} />
                      </div>
                    </div>
                    {renderAnnotationSummary(item)}
                  </SortableItem>
                ) : (
                  <SortableItem
                    key={item.id}
                    id={item.id}
                    disabled={!canDrag}
                    className="flex flex-col gap-2 rounded-xl"
                  >
                    <div className={`selection-card${selectedIds.has(item.id) ? ' selection-card--selected' : ''}`}>
                      {isSelecting && (
                        <SelectionToggle
                          selected={selectedIds.has(item.id)}
                          onToggle={() => toggleSelection(item.id)}
                          label={item.name}
                        />
                      )}
                      {isSelecting && (
                        <button
                          type="button"
                          className="selection-overlay"
                          onClick={() => toggleSelection(item.id)}
                          aria-pressed={selectedIds.has(item.id)}
                          aria-label={`${selectedIds.has(item.id) ? 'Deselect' : 'Select'} ${item.name || 'item'}`}
                        />
                      )}
                      <div className={canDrag ? 'pointer-events-none' : ''}>
                        <TVShowCard tvShow={item} />
                      </div>
                    </div>
                    {renderAnnotationSummary(item)}
                  </SortableItem>
                )
              )}
            </div>
          </SortableContext>
          <DragOverlay>
            {activeItem ? (
              <div className="flex flex-col gap-2 rounded-xl pointer-events-none">
                <div className="pointer-events-none">
                  {mediaType === 'movie' ? <MovieCard movie={activeItem} /> : <TVShowCard tvShow={activeItem} />}
                </div>
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      )}

      <Modal
        open={isAnnotationModalOpen}
        onClose={closeAnnotationEditor}
        title={`Notes & tags for ${annotationTarget?.title || 'item'}`}
        containerClassName="items-end sm:items-center"
        panelClassName="max-h-[90vh] overflow-hidden rounded-b-none sm:rounded-b-2xl"
        bodyClassName="max-h-[60vh] overflow-y-auto"
        footer={(
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {source === 'local'
                ? 'Saved locally. Sign in to sync across devices.'
                : 'Tip: Cmd/Ctrl + Enter to save.'}
            </div>
            <div className="flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={closeAnnotationEditor}
                disabled={isSavingAnnotations}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={handleSaveAnnotations}
                disabled={isSavingAnnotations || hasTagInputError || !hasAnnotationChanges}
              >
                {isSavingAnnotations ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </div>
        )}
      >
        <div className="space-y-6" onKeyDown={handleAnnotationKeyDown}>
          <div>
            <div className="flex items-center justify-between">
              <label htmlFor="annotation-tags" className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                Tags
              </label>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {draftTags.length}/{TAG_LIMIT}
              </span>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {draftTags.length === 0 ? (
                <span className="text-xs text-gray-500 dark:text-gray-400">No tags yet.</span>
              ) : (
                draftTags.map((tag, index) => (
                  <span
                    key={`${tag}-${index}`}
                    className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-white px-2 py-1 text-xs font-semibold text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
                  >
                    {tag}
                    <button
                      type="button"
                      className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
                      onClick={() => removeTagAtIndex(index)}
                      aria-label={`Remove tag ${tag}`}
                    >
                      x
                    </button>
                  </span>
                ))
              )}
            </div>
            <input
              ref={tagInputRef}
              id="annotation-tags"
              type="text"
              value={tagInput}
              onChange={(event) => {
                setTagInput(event.target.value);
                if (tagInputError) {
                  setTagInputError('');
                }
              }}
              onKeyDown={handleTagInputKeyDown}
              onBlur={() => {
                if (!tagInput.trim()) return;
                commitTagInput(tagInput);
                setTagInput('');
              }}
              placeholder={tagLimitReached ? 'Tag limit reached' : 'Add tags (press Enter or comma)'}
              disabled={tagLimitReached}
              className="mt-3 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
            />
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              Max {TAG_MAX_LENGTH} characters per tag. Use commas to add multiple.
            </p>
            {tagInputError && (
              <p className="mt-2 text-xs text-red-500 dark:text-red-400">
                {tagInputError}
              </p>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between">
              <label htmlFor="annotation-notes" className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                Notes
              </label>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {draftNotes.length}/{NOTES_MAX_LENGTH}
              </span>
            </div>
            <textarea
              id="annotation-notes"
              value={draftNotes}
              onChange={(event) => setDraftNotes(event.target.value)}
              placeholder="Add a quick note about why you saved this."
              maxLength={NOTES_MAX_LENGTH}
              rows={5}
              className="mt-2 w-full resize-none rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
            />
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              {notesRemaining} characters remaining.
            </p>
          </div>

          {annotationError && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600 dark:border-red-900/60 dark:bg-red-900/20 dark:text-red-300">
              {annotationError}
            </div>
          )}
        </div>
      </Modal>

      <Modal
        open={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title={`Remove ${selectedItems.length} item${selectedItems.length === 1 ? '' : 's'}?`}
        footer={(
          <div className="flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setIsDeleteModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleDeleteConfirm}
              disabled={selectedItems.length === 0}
              className="border-red-200 text-red-600 hover:bg-red-50 dark:border-red-900/60 dark:text-red-300 dark:hover:bg-red-900/20"
            >
              Confirm
            </Button>
          </div>
        )}
      >
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          This will remove the selected items from {activeList?.name || 'this list'}.
        </p>
        <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-200">
          {deletePreviewItems.map((item) => (
            <li key={item.id} className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-red-400" />
              <span className="truncate">{item.title || item.name}</span>
            </li>
          ))}
        </ul>
        {remainingDeleteCount > 0 && (
          <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
            and {remainingDeleteCount} more item{remainingDeleteCount === 1 ? '' : 's'}
          </p>
        )}
      </Modal>
    </div>
  );
}
