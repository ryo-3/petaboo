interface ErrorDisplayProps {
  errors: string[];
  onClearErrors: () => void;
}

export function ErrorDisplay({ errors, onClearErrors }: ErrorDisplayProps) {
  if (errors.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {errors.map((error, index) => (
        <div
          key={index}
          className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded shadow-lg max-w-sm"
        >
          <div className="flex justify-between items-start">
            <span className="text-sm">{error}</span>
            <button
              onClick={onClearErrors}
              className="ml-2 text-red-500 hover:text-red-700"
            >
              ×
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}