export default function Button({ 
  children, 
  variant = 'primary', 
  size = 'md',
  className = '',
  disabled = false,
  type = 'button',
  ...props 
}) {
  const isTab = variant === 'tab' || variant === 'tab-active';
  const baseStyles = 'font-medium rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900 disabled:opacity-50 disabled:cursor-not-allowed';
  const motionStyles = isTab
    ? 'transition-colors duration-200'
    : disabled
      ? 'transition-[background-color,border-color,color] duration-200'
      : 'transition-[transform,background-color,box-shadow,border-color,color] duration-300 ease-out hover:-translate-y-0.5 hover:shadow-lg active:translate-y-0 active:scale-[0.98]';
  
  const variants = {
    primary: 'bg-primary-600 text-white hover:bg-primary-700 dark:bg-primary-500 dark:hover:bg-primary-600',
    secondary: 'bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700',
    ghost: 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800',
    tab: 'whitespace-nowrap border-b-2 border-transparent',
    'tab-active': 'whitespace-nowrap border-b-2'
  };
  
  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
    tab: 'px-4 py-3 text-sm'
  };
  
  return (
    <button
      type={type}
      disabled={disabled}
      className={`${baseStyles} ${motionStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
