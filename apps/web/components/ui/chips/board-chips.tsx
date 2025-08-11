import { useState, useEffect } from "react";
import type { Board } from "@/src/types/board";

interface BoardChipsProps {
  boards: Board[];
  variant?: "default" | "compact";
  maxWidth?: string; // 最大幅（例: "100px", "8rem"）
  maxDisplay?: number; // 表示する最大ボード数
}

export default function BoardChips({ 
  boards, 
  variant = "default",
  maxWidth = "120px", // デフォルトは120px
  maxDisplay = 3 // デフォルトは3つまで表示
}: BoardChipsProps) {
  const [isAllExpanded, setIsAllExpanded] = useState(false);
  const [showAll, setShowAll] = useState(false);
  
  // ボードが変わったら展開状態をリセット
  useEffect(() => {
    setIsAllExpanded(false);
    setShowAll(false);
  }, [boards]);
  
  if (!boards || boards.length === 0) return null;

  const sizeClasses = variant === "compact" 
    ? "px-2 py-1 text-xs" 
    : "px-3 py-1 text-sm";

  // 全体の展開状態を切り替え（どれかクリックしたら全部展開/折りたたみ）
  const toggleExpand = () => {
    setIsAllExpanded(!isAllExpanded);
  };

  // 全ボード表示/制限表示を切り替え
  const toggleShowAll = () => {
    setShowAll(!showAll);
  };

  // 表示するボードを決定
  const displayBoards = showAll || boards.length <= maxDisplay 
    ? boards 
    : boards.slice(0, maxDisplay);
  const remainingCount = boards.length - maxDisplay;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {displayBoards.map((board) => {
        return (
          <button
            key={board.id}
            onClick={toggleExpand}
            className={`inline-flex items-center rounded-md bg-light-Blue text-white cursor-pointer ${sizeClasses}`}
            style={!isAllExpanded ? { maxWidth } : undefined}
          >
            <span className={!isAllExpanded ? "truncate" : ""}>
              {board.name}
            </span>
          </button>
        );
      })}
      {boards.length > maxDisplay && !showAll && (
        <button
          onClick={toggleShowAll}
          className={`inline-flex items-center rounded-md bg-light-Blue text-white cursor-pointer ${sizeClasses}`}
        >
          <span>+{remainingCount}</span>
        </button>
      )}
    </div>
  );
}