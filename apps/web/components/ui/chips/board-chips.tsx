import { useState, useEffect } from "react";
import type { Board } from "@/src/types/board";

interface BoardChipsProps {
  boards: Board[];
  variant?: "default" | "compact";
  maxWidth?: string; // 最大幅（例: "100px", "8rem"）
  maxDisplay?: number; // 表示する最大ボード数
  interactive?: boolean; // クリック可能かどうか（デフォルト: true）
}

export default function BoardChips({
  boards,
  variant = "default",
  maxWidth = "120px", // デフォルトは120px
  maxDisplay = 3, // デフォルトは3つまで表示
  interactive = true, // デフォルトはクリック可能
}: BoardChipsProps) {
  const [expandedBoards, setExpandedBoards] = useState<Set<number>>(new Set());
  const [showAll, setShowAll] = useState(false);

  // ボードが変わったら展開状態をリセット
  useEffect(() => {
    setExpandedBoards(new Set());
    setShowAll(false);
  }, [boards]);

  if (!boards || boards.length === 0) return null;

  const sizeClasses =
    variant === "compact" ? "px-2 py-1 text-xs" : "px-3 py-1 text-sm";

  // 個別のボードの展開状態を切り替え
  const toggleBoard = (boardId: number) => {
    setExpandedBoards((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(boardId)) {
        newSet.delete(boardId);
      } else {
        newSet.add(boardId);
      }
      return newSet;
    });
  };

  // 全ボード表示/制限表示を切り替え
  const toggleShowAll = () => {
    setShowAll(!showAll);
  };

  // 表示するボードを決定
  const displayBoards =
    showAll || boards.length <= maxDisplay
      ? boards
      : boards.slice(0, maxDisplay);
  const remainingCount = boards.length - maxDisplay;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {displayBoards.map((board) => {
        const isExpanded = expandedBoards.has(board.id);
        const Component = interactive ? "button" : "div";
        return (
          <Component
            key={board.id}
            onClick={interactive ? () => toggleBoard(board.id) : undefined}
            className={`inline-flex items-center rounded-md bg-light-Blue text-white ${interactive ? "cursor-pointer" : "cursor-default"} ${sizeClasses}`}
            style={!isExpanded ? { maxWidth } : undefined}
          >
            <span className={!isExpanded ? "truncate" : ""}>{board.name}</span>
          </Component>
        );
      })}
      {boards.length > maxDisplay && !showAll && (
        <div
          onClick={interactive ? toggleShowAll : undefined}
          className={`inline-flex items-center rounded-md bg-light-Blue text-white ${interactive ? "cursor-pointer" : "cursor-default"} ${sizeClasses}`}
        >
          <span>+{remainingCount}</span>
        </div>
      )}
    </div>
  );
}
