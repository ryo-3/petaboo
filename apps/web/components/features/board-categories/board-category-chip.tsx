import type { BoardCategory } from "@/src/types/board-categories";

interface BoardCategoryChipProps {
  category: BoardCategory;
  size?: "small" | "medium";
}

export default function BoardCategoryChip({ 
  category, 
  size = "small" 
}: BoardCategoryChipProps) {
  const sizeClasses = {
    small: "px-2 py-1 text-xs",
    medium: "px-3 py-1.5 text-sm",
  };

  return (
    <div
      className={`inline-flex items-center rounded-md font-medium bg-gray-100 text-gray-700 ${sizeClasses[size]}`}
    >
      {category.icon && (
        <span className="mr-1">{category.icon}</span>
      )}
      <span>{category.name}</span>
    </div>
  );
}