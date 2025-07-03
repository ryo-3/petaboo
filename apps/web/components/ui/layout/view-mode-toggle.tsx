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
  return (
    <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
      <button
        onClick={() => onViewModeChange("card")}
        disabled={disabled}
        className={`p-1.5 rounded transition-colors ${
          viewMode === "card"
            ? "bg-white text-gray-700 shadow-sm"
            : "text-gray-500 hover:text-gray-700"
        } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
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
      </button>
      <button
        onClick={() => onViewModeChange("list")}
        disabled={disabled}
        className={`p-1.5 rounded transition-colors ${
          viewMode === "list"
            ? "bg-white text-gray-700 shadow-sm"
            : "text-gray-500 hover:text-gray-700"
        } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
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
      </button>
    </div>
  );
}

export default ViewModeToggle;
