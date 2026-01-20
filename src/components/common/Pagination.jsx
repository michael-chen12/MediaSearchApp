export default function Pagination({ currentPage, totalPages, onPageChange }) {
  const maxPages = Math.min(totalPages, 500);

  const getPageNumbers = () => {
    const pages = [];
    const showPages = 5;

    if (maxPages <= showPages + 2) {
      for (let i = 1; i <= maxPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= showPages; i++) {
          pages.push(i);
        }
        pages.push('...');
        pages.push(maxPages);
      } else if (currentPage >= maxPages - 2) {
        pages.push(1);
        pages.push('...');
        for (let i = maxPages - showPages + 1; i <= maxPages; i++) {
          pages.push(i);
        }
      } else {
        pages.push(1);
        pages.push('...');
        for (let i = currentPage - 1; i <= currentPage + 1; i++) {
          pages.push(i);
        }
        pages.push('...');
        pages.push(maxPages);
      }
    }

    return pages;
  };

  const handlePrevious = () => {
    if (currentPage > 1) {
      onPageChange(currentPage - 1);
    }
  };

  const handleNext = () => {
    if (currentPage < maxPages) {
      onPageChange(currentPage + 1);
    }
  };

  const pageNumbers = getPageNumbers();

  return (
    <nav className="flex items-center justify-center gap-2 mt-8" aria-label="Pagination">
      <button
        onClick={handlePrevious}
        disabled={currentPage === 1}
        className="px-4 py-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500"
        aria-label="Previous page"
      >
        Previous
      </button>

      <div className="hidden sm:flex items-center gap-2">
        {pageNumbers.map((page, index) => (
          typeof page === 'number' ? (
            <button
              key={index}
              onClick={() => onPageChange(page)}
              className={`w-10 h-10 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                currentPage === page
                  ? 'bg-primary-600 text-white'
                  : 'bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
              aria-label={`Go to page ${page}`}
              aria-current={currentPage === page ? 'page' : undefined}
            >
              {page}
            </button>
          ) : (
            <span key={index} className="text-gray-500 dark:text-gray-400">
              {page}
            </span>
          )
        ))}
      </div>

      <div className="sm:hidden text-gray-700 dark:text-gray-300">
        Page {currentPage} of {maxPages}
      </div>

      <button
        onClick={handleNext}
        disabled={currentPage === maxPages}
        className="px-4 py-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500"
        aria-label="Next page"
      >
        Next
      </button>
    </nav>
  );
}
