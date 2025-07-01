interface LoadingStateProps {
  message?: string;
  className?: string;
}

function LoadingState({ 
  message = "読み込み中...", 
  className = "text-center py-4 text-gray-500" 
}: LoadingStateProps) {
  return (
    <div className={className}>
      {message}
    </div>
  );
}

export default LoadingState;