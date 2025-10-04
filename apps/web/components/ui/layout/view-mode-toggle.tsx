import CardViewIcon from "@/components/icons/card-view-icon";
import ListViewIcon from "@/components/icons/list-view-icon";
import Tooltip from "@/components/ui/base/tooltip";

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
    <Tooltip
      text={viewMode === "card" ? "リストに切り替え" : "カードに切り替え"}
      position="bottom"
    >
      <button
        onClick={handleToggle}
        disabled={disabled}
        className={`bg-gray-100 rounded-lg ${buttonSize} flex items-center justify-center transition-colors ${
          disabled
            ? "opacity-50 cursor-not-allowed"
            : "text-gray-500 hover:text-gray-700"
        }`}
      >
        {viewMode === "card" ? (
          <CardViewIcon className={iconSize} />
        ) : (
          <ListViewIcon className={iconSize} />
        )}
      </button>
    </Tooltip>
  );
}

export default ViewModeToggle;
