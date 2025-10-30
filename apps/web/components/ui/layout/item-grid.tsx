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
    const gapClass = isBoard ? "gap-2" : "gap-3";
    const gapXClass = isBoard ? "gap-x-2" : "gap-x-3";

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
      className={`flex-1 md:overflow-y-auto overflow-x-hidden md:hover-scrollbar ${isBoard ? "" : "pr-2"} mb-2`}
    >
      {/* 上部余白用の空要素（固定ヘッダー分） */}
      {!isBoard && <div className="h-[70px] md:h-0" />}

      <div className={getGridClassName()}>{children}</div>

      {/* 下部余白用の空要素（モバイルナビゲーションバー分） */}
      {!isBoard && <div className="h-[80px] md:h-0" />}
    </div>
  );
}

export default ItemGrid;
