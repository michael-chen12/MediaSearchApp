export default function Footer() {
  return (
    <footer className="mt-auto bg-gray-100 dark:bg-gray-800 py-8">
      <div className="container mx-auto px-4">
        <div className="flex flex-col items-center justify-center gap-4 text-center">
          <p className="text-gray-600 dark:text-gray-400">
            Powered by{' '}
            <a
              href="https://www.themoviedb.org/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary-600 dark:text-primary-400 hover:underline"
            >
              The Movie Database (TMDB) API
            </a>
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-500">
            This product uses the TMDB API but is not endorsed or certified by TMDB.
          </p>
        </div>
      </div>
    </footer>
  );
}
