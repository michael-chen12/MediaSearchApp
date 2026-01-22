export default function Badge({ children, variant = 'default' }) {
  const variants = {
    default: 'bg-gray-100 text-gray-700',
    success: 'bg-green-100 text-green-700',
    warning: 'bg-yellow-100 text-yellow-700',
  };

  return (
    <span className={`px-2 py-1 rounded-full text-xs ${variants[variant]}`}>
      {children}
    </span>
  );
}
