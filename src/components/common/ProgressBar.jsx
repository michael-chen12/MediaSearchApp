export default function ProgressBar({
  current = 0,
  total = 0,
  label,
  size = 'md',
}) {
  const safeCurrent = Number.isFinite(current) ? current : 0;
  const safeTotal = Number.isFinite(total) ? total : 0;
  const clampedCurrent = safeTotal > 0 ? Math.min(Math.max(safeCurrent, 0), safeTotal) : 0;
  const percentage = safeTotal > 0
    ? Math.round((clampedCurrent / safeTotal) * 100)
    : 0;
  const fillClass = percentage >= 100 ? 'bg-emerald-500' : 'bg-blue-500';
  const trackClass = 'bg-gray-200 dark:bg-gray-700';
  const heightClass = size === 'sm' ? 'h-2' : size === 'lg' ? 'h-4' : 'h-3';
  const labelText = label ?? (
    safeTotal > 0
      ? `${clampedCurrent}/${safeTotal} episodes watched`
      : 'No progress yet'
  );

  return (
    <div className="w-full">
      <div
        className={`w-full ${trackClass} ${heightClass} rounded-full overflow-hidden`}
        role="progressbar"
        aria-valuenow={clampedCurrent}
        aria-valuemin={0}
        aria-valuemax={safeTotal}
        aria-label={labelText}
      >
        <div
          className={`${fillClass} ${heightClass} transition-all duration-300`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      {labelText ? (
        <div className="mt-1 text-xs text-gray-600 dark:text-gray-400">
          {labelText}
        </div>
      ) : null}
    </div>
  );
}
