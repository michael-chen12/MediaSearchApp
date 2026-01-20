import { useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useWatchlist } from '../context/WatchlistContext';
import TabNavigation from '../components/common/navigation/TabNavigation';
import MovieCard from '../components/common/MovieCard';
import TVShowCard from '../components/common/TVShowCard';
import EmptyState from '../components/common/EmptyState';

export default function Watchlist() {
  const [searchParams] = useSearchParams();
  const mediaType = searchParams.get('mediaType') || 'movie';
  const { getWatchlist } = useWatchlist();

  const movieWatchlist = getWatchlist('movie');
  const tvWatchlist = getWatchlist('tv');

  const tabs = [
    { id: 'movie', label: 'Movies', count: movieWatchlist.length },
    { id: 'tv', label: 'TV Shows', count: tvWatchlist.length }
  ];

  const currentWatchlist = mediaType === 'movie' ? movieWatchlist : tvWatchlist;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          My Watchlist
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          {currentWatchlist.length} {mediaType === 'movie' ? 'movies' : 'TV shows'} to watch
        </p>
      </div>

      <div className="mb-8">
        <TabNavigation tabs={tabs} />
      </div>

      {currentWatchlist.length === 0 ? (
        <EmptyState
          title={`No ${mediaType === 'movie' ? 'movies' : 'TV shows'} in watchlist`}
          message={`Add ${mediaType === 'movie' ? 'movies' : 'TV shows'} you want to watch later!`}
        >
          <Link
            to="/"
            className="inline-block mt-4 px-6 py-3 bg-primary-600 hover:bg-primary-700 dark:bg-primary-500 dark:hover:bg-primary-600 text-white rounded-lg transition-colors"
          >
            Explore {mediaType === 'movie' ? 'Movies' : 'TV Shows'}
          </Link>
        </EmptyState>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
          {currentWatchlist.map((item) =>
            mediaType === 'movie' ? (
              <MovieCard key={item.id} movie={item} />
            ) : (
              <TVShowCard key={item.id} tvShow={item} />
            )
          )}
        </div>
      )}
    </div>
  );
}
