import { Link } from 'react-router-dom';
import { getImageUrl } from '../../lib/tmdbClient';

export default function PersonCard({ person }) {
  const profileUrl = getImageUrl(person.profile_path, 'profile', 'medium');

  return (
    <Link
      to={`/person/${person.id}`}
      className="group block rounded-lg bg-gray-100 dark:bg-gray-800 shadow-md card-anim"
      aria-label={`View details for ${person.name}`}
    >
      <div className="aspect-[2/3] relative overflow-hidden bg-gray-200 dark:bg-gray-700">
        {profileUrl ? (
          <img
            src={profileUrl}
            alt={`${person.name} profile`}
            className="w-full h-full object-cover card-image"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400 dark:text-gray-600">
            <svg
              className="w-16 h-16"
              fill="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
            </svg>
          </div>
        )}
      </div>

      <div className="p-4 card-body">
        <h3 className="font-semibold text-gray-900 dark:text-gray-100 line-clamp-2 mb-1">
          {person.name}
        </h3>
        {person.known_for_department && (
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {person.known_for_department}
          </p>
        )}
      </div>
    </Link>
  );
}
