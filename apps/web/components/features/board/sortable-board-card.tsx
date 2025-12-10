"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { BoardWithStats } from "@/src/types/board";
import BoardCard from "./board-card";

interface SortableBoardCardProps {
  board: BoardWithStats;
  onSelect: () => void;
  mode?: "normal" | "completed" | "deleted";
  onPermanentDelete?: (boardId: number) => void;
  isSelected?: boolean;
  isDragEnabled?: boolean;
}

export default function SortableBoardCard({
  board,
  onSelect,
  mode = "normal",
  onPermanentDelete,
  isSelected = false,
  isDragEnabled = true,
}: SortableBoardCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: board.id,
    disabled: !isDragEnabled,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1000 : "auto",
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={
        isDragEnabled && mode === "normal"
          ? "cursor-grab active:cursor-grabbing"
          : ""
      }
      {...(isDragEnabled && mode === "normal"
        ? { ...attributes, ...listeners }
        : {})}
    >
      <BoardCard
        board={board}
        onSelect={onSelect}
        mode={mode}
        onPermanentDelete={onPermanentDelete}
        isSelected={isSelected}
      />
    </div>
  );
}
