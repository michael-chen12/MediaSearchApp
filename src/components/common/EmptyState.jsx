import { Link } from 'react-router-dom';

export default function EmptyState({ title, message, showHomeLink = false }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <svg
        className="w-24 h-24 text-gray-400 dark:text-gray-600 mb-4"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
        />
      </svg>
      <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
        {title || 'No results found'}
      </h2>
      <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md">
        {message || 'Try adjusting your search or filters to find what you\'re looking for.'}
      </p>
      {showHomeLink && (
        <Link
          to="/"
          className="px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
        >
          Back to Home
        </Link>
      )}
    </div>
  );
}
