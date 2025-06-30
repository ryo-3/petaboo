interface ErrorStateProps {
  message?: string;
  className?: string;
}

function ErrorState({ 
  message = "エラーが発生しました", 
  className = "text-center py-4 text-red-500 text-sm" 
}: ErrorStateProps) {
  return (
    <div className={className}>
      {message}
    </div>
  );
}

export default ErrorState;