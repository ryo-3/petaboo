import { ReactNode } from "react";

interface ItemGridProps {
  viewMode: "card" | "list";
  effectiveColumnCount: number;
  children: ReactNode;
  isBoard?: boolean; // ボード詳細画面での使用かどうか
}

function ItemGrid({
  viewMode,
  effectiveColumnCount,
  children,
  isBoard = false,
}: ItemGridProps) {
  const getGridClassName = () => {
    const gapClass = isBoard ? "gap-2" : "gap-4";
    const gapXClass = isBoard ? "gap-x-2" : "gap-x-4";

    if (viewMode === "card") {
      return `grid ${gapClass} ${
        effectiveColumnCount === 1
          ? "grid-cols-1"
          : effectiveColumnCount === 2
            ? "grid-cols-1 md:grid-cols-2"
            : effectiveColumnCount === 3
              ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
              : "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
      }`;
    } else {
      return `${
        effectiveColumnCount === 1
          ? "space-y-0"
          : effectiveColumnCount === 2
            ? `grid grid-cols-2 ${gapXClass}`
            : effectiveColumnCount === 3
              ? `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 ${gapXClass}`
              : `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 ${gapXClass}`
      }`;
    }
  };

  return (
    <div
      className={`flex-1 overflow-auto hover-scrollbar ${isBoard ? "" : "pr-2"} pb-10 mb-2`}
    >
      <div className={getGridClassName()}>{children}</div>
    </div>
  );
}

export default ItemGrid;
