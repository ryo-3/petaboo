import { ReactNode } from "react";

interface ItemGridProps {
  effectiveColumnCount: number;
  children: ReactNode;
  isBoard?: boolean; // ボード詳細画面での使用かどうか
}

function ItemGrid({
  effectiveColumnCount,
  children,
  isBoard = false,
}: ItemGridProps) {
  const getGridClassName = () => {
    const gapClass = isBoard ? "gap-2" : "gap-3";

    return `grid ${gapClass} ${
      effectiveColumnCount === 1
        ? "grid-cols-1"
        : effectiveColumnCount === 2
          ? "grid-cols-1 md:grid-cols-2"
          : effectiveColumnCount === 3
            ? "grid-cols-1 md:grid-cols-3"
            : "grid-cols-1 md:grid-cols-4"
    }`;
  };

  return (
    <div
      className={`flex-1 md:overflow-y-auto overflow-x-hidden md:hover-scrollbar ${isBoard ? "" : "px-2 pt-[43px]"} mb-2`}
    >
      <div className={getGridClassName()}>{children}</div>
    </div>
  );
}

export default ItemGrid;
