import { useMemo, useState } from 'react';
import { useQueries } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { getTVShowDetails, getImageUrl } from '../../lib/tmdbClient';
import { formatDate, formatEpisode } from '../../utils/format';

const DAY_COUNT = 7;

const startOfWeek = (date) => {
  const value = new Date(date);
  const day = value.getDay();
  const diff = (day + 6) % 7;
  value.setDate(value.getDate() - diff);
  value.setHours(0, 0, 0, 0);
  return value;
};

const addDays = (date, amount) => {
  const value = new Date(date);
  value.setDate(value.getDate() + amount);
  return value;
};

const buildDateKey = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const isSameDateKey = (a, b) => a === b;

export default function CalendarView({ items = [] }) {
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));

  const weekDays = useMemo(() => (
    Array.from({ length: DAY_COUNT }, (_, index) => {
      const date = addDays(weekStart, index);
      return {
        date,
        key: buildDateKey(date),
      };
    })
  ), [weekStart]);

  const detailsQueries = useQueries({
    queries: items.map((item) => ({
      queryKey: ['tvShowDetails', item.id],
      queryFn: () => getTVShowDetails(item.id),
      enabled: items.length > 0,
      staleTime: 1000 * 60 * 60 * 24,
    })),
  });

  const episodesByDate = useMemo(() => {
    const map = new Map();
    weekDays.forEach((day) => map.set(day.key, []));

    items.forEach((item, index) => {
      const details = detailsQueries[index]?.data;
      const nextEpisode = details?.next_episode_to_air;
      if (!nextEpisode?.air_date) return;
      const dateKey = nextEpisode.air_date;
      if (!map.has(dateKey)) return;

      map.get(dateKey).push({
        showId: item.id,
        showName: details?.name || item.name || item.title || 'Untitled',
        posterPath: item.poster_path || details?.poster_path || null,
        seasonNumber: nextEpisode.season_number,
        episodeNumber: nextEpisode.episode_number,
        episodeName: nextEpisode.name || 'Episode',
        airDate: nextEpisode.air_date,
        stillPath: nextEpisode.still_path || null,
      });
    });

    return map;
  }, [detailsQueries, items, weekDays]);

  const rangeLabel = `${formatDate(weekDays[0].key)} - ${formatDate(weekDays[DAY_COUNT - 1].key)}`;
  const todayKey = buildDateKey(new Date());
  const isLoading = detailsQueries.some((query) => query.isLoading);
  const daySections = weekDays
    .map((day) => ({
      ...day,
      entries: episodesByDate.get(day.key) || [],
    }))
    .filter((day) => day.entries.length > 0);

  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-6 text-sm text-gray-600 shadow-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300">
        Add TV shows to your watchlist to see upcoming episodes.
      </div>
    );
  }

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-900">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400">
            Weekly Schedule
          </p>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {rangeLabel}
          </h2>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setWeekStart(startOfWeek(new Date()))}
            className="rounded-full border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700 transition hover:bg-gray-100 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-800"
          >
            Today
          </button>
          <button
            type="button"
            onClick={() => setWeekStart((prev) => addDays(prev, -DAY_COUNT))}
            className="rounded-full border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700 transition hover:bg-gray-100 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-800"
          >
            Previous
          </button>
          <button
            type="button"
            onClick={() => setWeekStart((prev) => addDays(prev, DAY_COUNT))}
            className="rounded-full border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700 transition hover:bg-gray-100 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-800"
          >
            Next
          </button>
        </div>
      </div>

      <div className="mt-6 space-y-4">
        {isLoading && daySections.length === 0 && (
          <div className="rounded-xl border border-dashed border-gray-300 px-4 py-6 text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
            Loading this week&apos;s schedule...
          </div>
        )}

        {!isLoading && daySections.length === 0 && (
          <div className="rounded-xl border border-dashed border-gray-300 px-4 py-6 text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
            No upcoming episodes this week.
          </div>
        )}

        {daySections.map((day) => {
          const isToday = isSameDateKey(day.key, todayKey);
          const entryCount = day.entries.length;

          return (
            <div
              key={day.key}
              className={`rounded-2xl border px-4 py-4 ${
                isToday
                  ? 'border-primary-400 bg-primary-50/50 dark:border-primary-400/60 dark:bg-primary-500/10'
                  : 'border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-950'
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400">
                    {day.date.toLocaleDateString('en-US', { weekday: 'long' })}
                  </p>
                  <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    {day.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </p>
                </div>
                <span className="text-xs font-semibold text-gray-600 dark:text-gray-400">
                  {entryCount} episode{entryCount === 1 ? '' : 's'}
                </span>
              </div>

              <div className="mt-4 space-y-3">
                {day.entries.map((entry) => {
                  const posterUrl = getImageUrl(entry.posterPath, 'poster', 'small');

                  return (
                    <Link
                      key={`${entry.showId}-${entry.seasonNumber}-${entry.episodeNumber}`}
                      to={`/tv/${entry.showId}`}
                      className="flex flex-wrap items-center gap-3 rounded-xl border border-gray-200 bg-white px-3 py-3 sm:flex-nowrap dark:border-gray-700 dark:bg-gray-900 transition-colors hover:border-primary-400 hover:bg-primary-50/30 dark:hover:border-primary-500 dark:hover:bg-primary-500/10"
                    >
                      <div className="h-14 w-10 overflow-hidden rounded-lg bg-gray-200 dark:bg-gray-800">
                        {posterUrl ? (
                          <img
                            src={posterUrl}
                            alt={`${entry.showName} poster`}
                            className="h-full w-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-gray-400 dark:text-gray-600">
                            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M4 7h16M4 17h16M6 7v10M18 7v10" />
                            </svg>
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                          {entry.showName}
                        </p>
                        <p className="text-base font-semibold text-gray-900 dark:text-gray-100 line-clamp-2">
                          {entry.episodeName}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {formatEpisode(entry.seasonNumber, entry.episodeNumber)}
                        </p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
