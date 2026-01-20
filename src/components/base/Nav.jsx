export default function Nav({ 
  children, 
  className = '',
  ariaLabel,
  variant = 'default',
  ...props 
}) {
  const variants = {
    default: '',
    tabs: 'border-b border-gray-200 dark:border-gray-700 mb-6',
    horizontal: 'flex gap-2 overflow-x-auto scrollbar-hide'
  };
  
  return (
    <nav
      className={`${variants[variant]} ${className}`}
      aria-label={ariaLabel}
      {...props}
    >
      {children}
    </nav>
  );
}
