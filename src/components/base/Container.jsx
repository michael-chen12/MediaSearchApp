export default function Container({ 
  children, 
  className = '',
  size = 'default',
  as = 'div',
  ...props 
}) {
  const Component = as;
  
  const sizes = {
    sm: 'max-w-4xl',
    default: 'max-w-7xl',
    lg: 'max-w-[1440px]',
    full: 'max-w-full'
  };
  
  return (
    <Component
      className={`mx-auto px-4 sm:px-6 lg:px-8 ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </Component>
  );
}
