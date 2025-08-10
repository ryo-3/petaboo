import type { Board } from "@/src/types/board";

interface BoardChipsProps {
  boards: Board[];
  variant?: "default" | "compact";
}

export default function BoardChips({ boards, variant = "default" }: BoardChipsProps) {
  if (!boards || boards.length === 0) return null;

  const sizeClasses = variant === "compact" 
    ? "px-2 py-1 text-xs" 
    : "px-3 py-1 text-sm";

  return (
    <div className="flex flex-wrap gap-2">
      {boards.map((board) => {
        return (
          <div 
            key={board.id} 
            className={`inline-flex items-center rounded-md overflow-hidden bg-light-Blue text-white ${sizeClasses}`}
          >
            <span>{board.name}</span>
          </div>
        );
      })}
    </div>
  );
}