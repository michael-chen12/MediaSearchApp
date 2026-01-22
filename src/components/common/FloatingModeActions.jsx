import { useEffect, useState } from 'react';

export default function FloatingModeActions({
  mode,
  onConfirm,
  onCancel,
  confirmDisabled = false,
}) {
  if (!mode) return null;

  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(false);
    const raf = requestAnimationFrame(() => setIsVisible(true));
    return () => cancelAnimationFrame(raf);
  }, [mode]);

  const modeLabel = mode === 'delete'
    ? 'delete mode'
    : mode === 'reorder'
      ? 'reorder mode'
      : mode;

  const buttonMotionClass = `transition-all duration-600 ease-out ${isVisible ? 'translate-y-0 opacity-100 rotate-0' : 'translate-y-6 opacity-0 -rotate-18'}`;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3">
      <button
        type="button"
        onClick={onCancel}
        aria-label={`Exit ${modeLabel}`}
        title={`Exit ${modeLabel}`}
        className={`h-14 w-14 rounded-full border border-gray-300 bg-white text-gray-700 shadow-lg transition-transform hover:-translate-y-0.5 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800 ${buttonMotionClass}`}
      >
        <svg className="mx-auto h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 6l12 12M6 18L18 6" />
        </svg>
      </button>
      <button
        type="button"
        onClick={onConfirm}
        disabled={confirmDisabled}
        aria-label={`Confirm ${modeLabel}`}
        title={`Confirm ${modeLabel}`}
        className={`h-14 w-14 rounded-full border border-green-500 bg-green-500 text-white shadow-lg transition-transform hover:-translate-y-0.5 hover:bg-green-400 focus:outline-none focus:ring-2 focus:ring-primary-500 ${confirmDisabled ? 'cursor-not-allowed opacity-50' : ''} ${buttonMotionClass}`}
      >
        <svg className="mx-auto h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      </button>
    </div>
  );
}
