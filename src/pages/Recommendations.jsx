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
    <div>
      <h1 className="text-3xl font-bold mb-6">Recommendations</h1>
      
      <select 
        value={selectedGenre} 
        onChange={(e) => setSelectedGenre(e.target.value)}
        className="mb-6 px-4 py-2 rounded-lg border"
      >
        <option value="all">All Genres</option>
        <option value="28">Action</option>
        <option value="35">Comedy</option>
      </select>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
        {data.results.map(movie => (
          <MovieCard key={movie.id} movie={movie} />
        ))}
      </div>
    </div>
  );
}
