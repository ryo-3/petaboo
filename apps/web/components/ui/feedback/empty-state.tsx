interface EmptyStateProps {
  message: string;
  className?: string;
  variant?: 'centered' | 'simple';
}

function EmptyState({ 
  message, 
  className,
  variant = 'centered'
}: EmptyStateProps) {
  if (variant === 'simple') {
    return (
      <div className={className || "text-center py-4 text-gray-400 text-sm"}>
        {message}
      </div>
    );
  }

  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="text-center text-gray-400">{message}</div>
    </div>
  );
}

export default EmptyState;