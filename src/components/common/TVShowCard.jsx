import { Link } from 'react-router-dom';
import { getImageUrl } from '../../lib/tmdbClient';
import { formatYear, formatRating } from '../../utils/format';

export default function TVShowCard({ tvShow }) {
  const posterUrl = getImageUrl(tvShow.poster_path, 'poster', 'medium');

  return (
    <Link
      to={`/tv/${tvShow.id}`}
      className="group block rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800 shadow-md hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
      aria-label={`View details for ${tvShow.name}`}
    >
      <div className="aspect-[2/3] relative overflow-hidden bg-gray-200 dark:bg-gray-700">
        {posterUrl ? (
          <img
            src={posterUrl}
            alt={`${tvShow.name} poster`}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400 dark:text-gray-600">
            <svg
              className="w-16 h-16"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z"
              />
            </svg>
          </div>
        )}

        {tvShow.vote_average > 0 && (
          <div className="absolute top-2 right-2 bg-black/80 text-white px-2 py-1 rounded-md text-sm font-semibold flex items-center gap-1">
            <span className="text-yellow-400">⭐</span>
            {formatRating(tvShow.vote_average)}
          </div>
        )}
      </div>

      <div className="p-4">
        <h3 className="font-semibold text-gray-900 dark:text-gray-100 line-clamp-2 mb-1">
          {tvShow.name}
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {formatYear(tvShow.first_air_date)}
        </p>
      </div>
    </Link>
  );
}
