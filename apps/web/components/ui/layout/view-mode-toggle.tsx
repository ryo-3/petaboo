interface ViewModeToggleProps {
  viewMode: "card" | "list";
  onViewModeChange: (mode: "card" | "list") => void;
  disabled?: boolean;
}

function ViewModeToggle({
  viewMode,
  onViewModeChange,
  disabled = false,
}: ViewModeToggleProps) {
  const handleToggle = () => {
    if (!disabled) {
      onViewModeChange(viewMode === "card" ? "list" : "card");
    }
  };

  return (
    <div className="flex items-center gap-1 bg-gray-100 rounded-lg">
      <button
        onClick={handleToggle}
        disabled={disabled}
        className={`p-1.5 rounded transition-colors relative overflow-hidden ${
          disabled ? "opacity-50 cursor-not-allowed" : "text-gray-500 hover:text-gray-700"
        }`}
      >
        <div className="relative w-4 h-4">
          <div
            className={`absolute inset-0 transition-all duration-300 ${
              viewMode === "card" 
                ? "opacity-100 scale-100" 
                : "opacity-0 scale-75"
            }`}
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
              />
            </svg>
          </div>
          <div
            className={`absolute inset-0 transition-all duration-300 ${
              viewMode === "list" 
                ? "opacity-100 scale-100" 
                : "opacity-0 scale-75"
            }`}
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </div>
        </div>
      </button>
    </div>
  );
}

export default ViewModeToggle;
