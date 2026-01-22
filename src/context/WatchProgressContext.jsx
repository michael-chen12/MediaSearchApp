import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { isSupabaseConfigured, supabase } from '../lib/supabaseClient';
import { useAuth } from './AuthContext';
import { readWatchProgress, writeWatchProgress } from '../utils/watchProgressStorage';

const WatchProgressContext = createContext();

const WATCH_PROGRESS_MIGRATION_KEY = 'cinematic_watch_progress_migrated';

const normalizeProgress = (value) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const normalized = {};
  Object.entries(value).forEach(([mediaId, seasons]) => {
    if (!seasons || typeof seasons !== 'object' || Array.isArray(seasons)) return;
    const normalizedSeasons = {};
    Object.entries(seasons).forEach(([seasonNumber, episodes]) => {
      if (!episodes || typeof episodes !== 'object' || Array.isArray(episodes)) return;
      const normalizedEpisodes = {};
      Object.entries(episodes).forEach(([episodeNumber, entry]) => {
        if (!entry || typeof entry !== 'object') return;
        const watched = Boolean(entry.watched);
        const watchedAt = typeof entry.watchedAt === 'string'
          ? entry.watchedAt
          : typeof entry.watched_at === 'string'
            ? entry.watched_at
            : null;
        normalizedEpisodes[episodeNumber] = {
          watched,
          watchedAt: watchedAt || null,
        };
      });
      if (Object.keys(normalizedEpisodes).length > 0) {
        normalizedSeasons[seasonNumber] = normalizedEpisodes;
      }
    });
    if (Object.keys(normalizedSeasons).length > 0) {
      normalized[mediaId] = normalizedSeasons;
    }
  });
  return normalized;
};

const mergeProgress = (localProgress, remoteProgress) => {
  const merged = normalizeProgress(remoteProgress);
  const normalizedLocal = normalizeProgress(localProgress);

  Object.entries(normalizedLocal).forEach(([mediaId, seasons]) => {
    if (!merged[mediaId]) {
      merged[mediaId] = {};
    }
    Object.entries(seasons).forEach(([seasonNumber, episodes]) => {
      if (!merged[mediaId][seasonNumber]) {
        merged[mediaId][seasonNumber] = {};
      }
      Object.entries(episodes).forEach(([episodeNumber, entry]) => {
        merged[mediaId][seasonNumber][episodeNumber] = entry;
      });
    });
  });

  return merged;
};

const buildProgressFromRows = (rows = []) => {
  const progress = {};
  rows.forEach((row) => {
    if (!row) return;
    const mediaId = Number(row.media_id);
    const seasonNumber = Number(row.season_number);
    const episodeNumber = Number(row.episode_number);
    if (!Number.isFinite(mediaId) || !Number.isFinite(seasonNumber) || !Number.isFinite(episodeNumber)) {
      return;
    }
    const mediaKey = String(mediaId);
    const seasonKey = String(seasonNumber);
    const episodeKey = String(episodeNumber);

    if (!progress[mediaKey]) {
      progress[mediaKey] = {};
    }
    if (!progress[mediaKey][seasonKey]) {
      progress[mediaKey][seasonKey] = {};
    }
    progress[mediaKey][seasonKey][episodeKey] = {
      watched: Boolean(row.watched),
      watchedAt: row.watched_at || null,
    };
  });
  return progress;
};

const hasEpisodeEntry = (progress, mediaKey, seasonKey, episodeKey) => {
  const season = progress?.[mediaKey]?.[seasonKey];
  if (!season || typeof season !== 'object') return false;
  return Object.prototype.hasOwnProperty.call(season, episodeKey);
};

const buildDiffPayload = (localProgress, remoteProgress, userId) => {
  const localNormalized = normalizeProgress(localProgress);
  const remoteNormalized = normalizeProgress(remoteProgress);
  const payload = [];

  Object.entries(localNormalized).forEach(([mediaId, seasons]) => {
    const mediaNumber = Number(mediaId);
    if (!Number.isFinite(mediaNumber)) return;
    Object.entries(seasons).forEach(([seasonNumber, episodes]) => {
      const seasonValue = Number(seasonNumber);
      if (!Number.isFinite(seasonValue)) return;
      Object.entries(episodes).forEach(([episodeNumber, entry]) => {
        const episodeValue = Number(episodeNumber);
        if (!Number.isFinite(episodeValue)) return;
        if (hasEpisodeEntry(remoteNormalized, mediaId, seasonNumber, episodeNumber)) return;
        payload.push({
          user_id: userId,
          media_type: 'tv',
          media_id: mediaNumber,
          season_number: seasonValue,
          episode_number: episodeValue,
          watched: Boolean(entry?.watched),
          watched_at: entry?.watchedAt || null,
        });
      });
    });
  });

  return payload;
};

const setEpisodeProgress = (prev, mediaKey, seasonKey, episodeKey, entry) => {
  const media = prev[mediaKey] || {};
  const season = media[seasonKey] || {};
  return {
    ...prev,
    [mediaKey]: {
      ...media,
      [seasonKey]: {
        ...season,
        [episodeKey]: entry,
      },
    },
  };
};

const getNumericKeys = (value) => Object.keys(value || {})
  .map((key) => Number(key))
  .filter((key) => Number.isFinite(key))
  .sort((a, b) => a - b);

export function WatchProgressProvider({ children }) {
  const { user } = useAuth();
  const [progressByMediaId, setProgressByMediaId] = useState(() => normalizeProgress(readWatchProgress()));
  const [warning, setWarning] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const localProgressRef = useRef(progressByMediaId);
  const pendingSyncRef = useRef(new Map());
  const syncTimeoutRef = useRef(null);

  useEffect(() => {
    localProgressRef.current = progressByMediaId;
    writeWatchProgress(progressByMediaId);
  }, [progressByMediaId]);

  useEffect(() => {
    if (!user || !isSupabaseConfigured || !supabase) {
      setIsLoading(false);
      setWarning('');
      return undefined;
    }

    let isMounted = true;
    setIsLoading(true);

    supabase
      .from('watch_progress')
      .select('*')
      .eq('user_id', user.id)
      .then(({ data, error }) => {
        if (!isMounted) return;
        if (error) {
          setWarning('Unable to sync watch progress. Showing local data.');
          setIsLoading(false);
          return;
        }

        const remoteProgress = buildProgressFromRows(data || []);
        const localSnapshot = localProgressRef.current;
        const merged = mergeProgress(localSnapshot, remoteProgress);
        setProgressByMediaId(merged);
        setIsLoading(false);

        if (!localStorage.getItem(WATCH_PROGRESS_MIGRATION_KEY)) {
          const payload = buildDiffPayload(localSnapshot, remoteProgress, user.id);
          if (payload.length === 0) {
            localStorage.setItem(WATCH_PROGRESS_MIGRATION_KEY, 'true');
            return;
          }

          supabase
            .from('watch_progress')
            .upsert(payload, { onConflict: 'user_id,media_id,season_number,episode_number' })
            .then(({ error: upsertError }) => {
              if (upsertError) {
                setWarning('Unable to migrate watch progress.');
                return;
              }
              localStorage.setItem(WATCH_PROGRESS_MIGRATION_KEY, 'true');
            })
            .catch(() => {
              setWarning('Unable to migrate watch progress.');
            });
        }
      })
      .catch(() => {
        if (!isMounted) return;
        setWarning('Unable to sync watch progress. Showing local data.');
        setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [user]);

  useEffect(() => {
    if (!user) {
      setWarning('');
    }
  }, [user]);

  const syncProgress = useCallback(async (payload) => {
    if (!user || !isSupabaseConfigured || !supabase || payload.length === 0) return;
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      throw new Error('Unable to sync watch progress.');
    }

    const { error } = await supabase
      .from('watch_progress')
      .upsert(payload, { onConflict: 'user_id,media_id,season_number,episode_number' });

    if (error) {
      throw error;
    }
  }, [user]);

  const flushPendingSync = useCallback(async () => {
    if (pendingSyncRef.current.size === 0) return;
    if (!user || !isSupabaseConfigured || !supabase) return;

    const payload = Array.from(pendingSyncRef.current.values());
    pendingSyncRef.current.clear();

    try {
      await syncProgress(payload);
    } catch (error) {
      setWarning('Unable to sync watch progress.');
      throw error;
    }
  }, [syncProgress, user]);

  const debouncedSync = useCallback((syncPayload) => {
    const key = `${syncPayload.media_id}-${syncPayload.season_number}-${syncPayload.episode_number}`;
    pendingSyncRef.current.set(key, syncPayload);

    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current);
    }

    syncTimeoutRef.current = setTimeout(() => {
      flushPendingSync();
    }, 500);
  }, [flushPendingSync]);

  useEffect(() => {
    return () => {
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
      if (pendingSyncRef.current.size > 0) {
        flushPendingSync();
      }
    };
  }, [flushPendingSync]);

  const markEpisodeWatched = useCallback(async (mediaId, seasonNumber, episodeNumber, watched = true) => {
    const mediaKey = String(mediaId);
    const seasonKey = String(seasonNumber);
    const episodeKey = String(episodeNumber);
    const watchedAt = watched ? new Date().toISOString() : null;

    setProgressByMediaId((prev) => setEpisodeProgress(
      prev,
      mediaKey,
      seasonKey,
      episodeKey,
      { watched, watchedAt },
    ));

    if (!user || !isSupabaseConfigured || !supabase) {
      return Promise.resolve();
    }

    try {
      debouncedSync({
        user_id: user.id,
        media_type: 'tv',
        media_id: Number(mediaId),
        season_number: Number(seasonNumber),
        episode_number: Number(episodeNumber),
        watched,
        watched_at: watchedAt,
      });
    } catch (error) {
      setWarning('Unable to sync watch progress.');
      return Promise.reject(error);
    }
    return Promise.resolve();
  }, [debouncedSync, user]);

  const markSeasonWatched = useCallback(async (
    mediaId,
    seasonNumber,
    watched = true,
    episodeNumbers = null,
  ) => {
    const mediaKey = String(mediaId);
    const seasonKey = String(seasonNumber);
    const season = progressByMediaId?.[mediaKey]?.[seasonKey];
    const normalizedEpisodeNumbers = Array.isArray(episodeNumbers)
      ? episodeNumbers.map((value) => Number(value)).filter(Number.isFinite)
      : Object.keys(season || {}).map((value) => Number(value)).filter(Number.isFinite);

    if (normalizedEpisodeNumbers.length === 0) {
      return Promise.resolve();
    }

    const watchedAt = watched ? new Date().toISOString() : null;
    const episodeKeys = normalizedEpisodeNumbers.map((value) => String(value));
    setProgressByMediaId((prev) => {
      const currentMedia = prev[mediaKey] || {};
      const currentSeason = currentMedia[seasonKey] || {};
      const nextSeason = { ...currentSeason };
      episodeKeys.forEach((episodeKey) => {
        nextSeason[episodeKey] = { watched, watchedAt };
      });
      return {
        ...prev,
        [mediaKey]: {
          ...currentMedia,
          [seasonKey]: nextSeason,
        },
      };
    });

    if (!user || !isSupabaseConfigured || !supabase) {
      return Promise.resolve();
    }

    const payload = normalizedEpisodeNumbers.map((episodeNumber) => ({
      user_id: user.id,
      media_type: 'tv',
      media_id: Number(mediaId),
      season_number: Number(seasonNumber),
      episode_number: episodeNumber,
      watched,
      watched_at: watchedAt,
    }));

    try {
      await syncProgress(payload);
    } catch (error) {
      setWarning('Unable to sync watch progress.');
      return Promise.reject(error);
    }

    return Promise.resolve();
  }, [progressByMediaId, syncProgress, user]);

  const getProgress = useCallback((mediaId) => {
    const mediaKey = String(mediaId);
    const mediaProgress = progressByMediaId?.[mediaKey];
    if (!mediaProgress) {
      return { totalEpisodes: 0, watchedEpisodes: 0, percentage: 0 };
    }

    let totalEpisodes = 0;
    let watchedEpisodes = 0;

    Object.values(mediaProgress).forEach((season) => {
      Object.values(season || {}).forEach((entry) => {
        totalEpisodes += 1;
        if (entry?.watched) watchedEpisodes += 1;
      });
    });

    const percentage = totalEpisodes > 0
      ? Math.round((watchedEpisodes / totalEpisodes) * 100)
      : 0;

    return { totalEpisodes, watchedEpisodes, percentage };
  }, [progressByMediaId]);

  const getSeasonProgress = useCallback((mediaId, seasonNumber) => {
    const mediaKey = String(mediaId);
    const seasonKey = String(seasonNumber);
    const season = progressByMediaId?.[mediaKey]?.[seasonKey];
    if (!season) {
      return { totalEpisodes: 0, watchedEpisodes: 0, percentage: 0 };
    }

    let totalEpisodes = 0;
    let watchedEpisodes = 0;

    Object.values(season).forEach((entry) => {
      totalEpisodes += 1;
      if (entry?.watched) watchedEpisodes += 1;
    });

    const percentage = totalEpisodes > 0
      ? Math.round((watchedEpisodes / totalEpisodes) * 100)
      : 0;

    return { totalEpisodes, watchedEpisodes, percentage };
  }, [progressByMediaId]);

  const getNextUnwatchedEpisode = useCallback((mediaId) => {
    const mediaKey = String(mediaId);
    const mediaProgress = progressByMediaId?.[mediaKey];
    if (!mediaProgress) return null;

    const seasons = getNumericKeys(mediaProgress);
    for (const seasonNumber of seasons) {
      const seasonKey = String(seasonNumber);
      const season = mediaProgress[seasonKey];
      const episodes = getNumericKeys(season);
      for (const episodeNumber of episodes) {
        const episodeKey = String(episodeNumber);
        const entry = season?.[episodeKey];
        if (!entry?.watched) {
          return { season: seasonNumber, episode: episodeNumber };
        }
      }
    }

    return null;
  }, [progressByMediaId]);

  return (
    <WatchProgressContext.Provider value={{
      progressByMediaId,
      markEpisodeWatched,
      markSeasonWatched,
      getProgress,
      getSeasonProgress,
      getNextUnwatchedEpisode,
      isLoading,
      warning,
    }}>
      {children}
    </WatchProgressContext.Provider>
  );
}

export function useWatchProgress() {
  const context = useContext(WatchProgressContext);
  if (!context) {
    throw new Error('useWatchProgress must be used within WatchProgressProvider');
  }
  return context;
}
