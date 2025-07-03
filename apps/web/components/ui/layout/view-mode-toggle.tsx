import CardViewIcon from "@/components/icons/card-view-icon";
import ListViewIcon from "@/components/icons/list-view-icon";

interface ViewModeToggleProps {
  viewMode: "card" | "list";
  onViewModeChange: (mode: "card" | "list") => void;
  disabled?: boolean;
  buttonSize: string;
  iconSize: string;
}

function ViewModeToggle({
  viewMode,
  onViewModeChange,
  disabled = false,
  buttonSize,
  iconSize,
}: ViewModeToggleProps) {
  const handleToggle = () => {
    if (!disabled) {
      onViewModeChange(viewMode === "card" ? "list" : "card");
    }
  };

  return (
    <button
      onClick={handleToggle}
      disabled={disabled}
      className={`bg-gray-100 rounded-lg ${buttonSize} flex items-center justify-center transition-colors ${
        disabled ? "opacity-50 cursor-not-allowed" : "text-gray-500 hover:text-gray-700"
      }`}
    >
      {viewMode === "card" ? (
        <CardViewIcon className={iconSize} />
      ) : (
        <ListViewIcon className={iconSize} />
      )}
    </button>
  );
}

export default ViewModeToggle;
