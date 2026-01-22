import { useEffect, useMemo, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
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
import Button from '../components/base/Button';

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
  const [isReorderMode, setIsReorderMode] = useState(false);
  const [selectionMode, setSelectionMode] = useState(false);
  const [deleteMode, setDeleteMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [moveTargetId, setMoveTargetId] = useState('');
  const [activeId, setActiveId] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

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
  const visibleWatchlist = useMemo(() => {
    const normalizedQuery = filterQuery.trim().toLowerCase();
    const normalizedYear = yearFilter.trim();
    const minRatingValue = Number(minRating);

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

    return filtered;
  }, [currentItems, filterQuery, minRating, sortBy, yearFilter]);

  const isSelecting = selectionMode || deleteMode;
  const selectedItems = useMemo(
    () => currentItems.filter((item) => selectedIds.has(item.id)),
    [currentItems, selectedIds]
  );
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
    setMoveTargetId('');
    setActiveId(null);
  }, [activeList?.id, mediaType]);

  useEffect(() => {
    if (sortBy !== 'manual') {
      setIsReorderMode(false);
    }
  }, [sortBy]);

  useEffect(() => {
    if (filterQuery.trim() || yearFilter.trim() || minRating.trim()) {
      setIsReorderMode(false);
    }
  }, [filterQuery, minRating, yearFilter]);

  const canReorder = isReorderMode
    && sortBy === 'manual'
    && !filterQuery.trim()
    && !yearFilter.trim()
    && !minRating.trim();
  const canDrag = canReorder && !isSelecting;
  const hasFilters = Boolean(filterQuery.trim() || yearFilter.trim() || minRating.trim());
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

      <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <label className="text-sm text-gray-600 dark:text-gray-400" htmlFor="watchlist-filter">
            Filter
          </label>
          <input
            id="watchlist-filter"
            type="text"
            value={filterQuery}
            onChange={(event) => setFilterQuery(event.target.value)}
            placeholder="Search titles"
            className="w-full sm:w-56 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
          <input
            id="watchlist-year"
            type="number"
            inputMode="numeric"
            value={yearFilter}
            onChange={(event) => setYearFilter(event.target.value)}
            placeholder="Year"
            className="w-28 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
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
            className="w-32 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
          {hasFilters && (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => {
                setFilterQuery('');
                setYearFilter('');
                setMinRating('');
              }}
            >
              Clear filters
            </Button>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="text-sm text-gray-600 dark:text-gray-400" htmlFor="watchlist-sort">
            Sort by
          </label>
          <select
            id="watchlist-sort"
            value={sortBy}
            onChange={(event) => setSortBy(event.target.value)}
            className="rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="manual">Manual</option>
            <option value="recent">Recently added</option>
            <option value="title">Title</option>
            <option value="release">Release date</option>
          </select>
          <Button
            type="button"
            variant={isReorderMode ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => {
              setIsReorderMode((prev) => !prev);
              setSelectionMode(false);
              setDeleteMode(false);
            }}
            disabled={reorderDisabled}
          >
            {isReorderMode ? 'Reordering' : 'Reorder'}
          </Button>
          {reorderDisabled && source === 'remote' && hasMissingRemoteIds && (
            <span className="text-xs text-gray-500 dark:text-gray-400">
              Syncing items before reorder…
            </span>
          )}
          <Button
            type="button"
            variant={selectionMode ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => {
              setSelectionMode((prev) => !prev);
              setIsReorderMode(false);
              setDeleteMode(false);
            }}
          >
            {selectionMode ? 'Selecting' : 'Select'}
          </Button>
          {deleteMode ? (
            <>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={handleDeletePrompt}
                disabled={selectedIds.size === 0}
                className="border-red-200 text-red-600 hover:bg-red-50 dark:border-red-900/60 dark:text-red-300 dark:hover:bg-red-900/20"
              >
                Confirm
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={exitDeleteMode}
              >
                Cancel
              </Button>
            </>
          ) : (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => {
                clearSelection();
                setDeleteMode(true);
                setSelectionMode(false);
                setIsReorderMode(false);
              }}
              className="border-red-200 text-red-600 hover:bg-red-50 dark:border-red-900/60 dark:text-red-300 dark:hover:bg-red-900/20"
            >
              Delete
            </Button>
          )}
        </div>
      </div>

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
