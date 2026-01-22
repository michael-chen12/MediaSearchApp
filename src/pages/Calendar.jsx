import { useMemo } from 'react';
import CalendarView from '../components/common/CalendarView';
import { useLists } from '../context/ListsContext';

export default function Calendar() {
  const { getSystemListItems } = useLists();
  const tvItems = useMemo(() => getSystemListItems('watchlist', 'tv'), [getSystemListItems]);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          Calendar
        </h1>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Upcoming episodes from your watchlist.
        </p>
      </div>

      {tvItems.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-6 text-sm text-gray-600 shadow-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300">
          Add TV shows to your watchlist to see upcoming episodes.
        </div>
      ) : (
        <CalendarView items={tvItems} />
      )}
    </div>
  );
}
