import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getRecommendations } from '../lib/tmdbClient';
import MovieCard from '../components/common/MovieCard';
import { MovieGridSkeleton } from '../components/common/LoadingSkeleton';
import EmptyState from '../components/common/EmptyState';

export default function Recommendations() {
  const [selectedGenre, setSelectedGenre] = useState('all');

  const { data, isLoading } = useQuery({
    queryKey: ['recommendations', selectedGenre],
    queryFn: () => getRecommendations({ genre: selectedGenre }),
  });

  if (isLoading) return <MovieGridSkeleton />;
  if (!data?.results?.length) {
    return <EmptyState title="No recommendations yet" />;
  }

  return (
    <div className="px-4 sm:px-0">
      <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 dark:text-gray-100 mb-4 sm:mb-6">Recommendations</h1>
      
      <select 
        value={selectedGenre} 
        onChange={(e) => setSelectedGenre(e.target.value)}
        className="mb-6 sm:mb-8 px-3 sm:px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-primary-500"
      >
        <option value="all">All Genres</option>
        <option value="28">Action</option>
        <option value="35">Comedy</option>
      </select>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-5 md:gap-6">
        {data.results.map(movie => (
          <MovieCard key={movie.id} movie={movie} />
        ))}
      </div>
    </div>
  );
}
