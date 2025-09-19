import BoardChips from "@/components/ui/chips/board-chips";
import { TAG_COLORS } from "@/src/constants/colors";
import type { Tag } from "@/src/types/tag";
import type { Board } from "@/src/types/board";

interface BoardTagDisplayProps {
  boards: Board[];
  tags: Tag[];
  className?: string;
  /** 上下のマージン設定 */
  spacing?: "tight" | "normal" | "loose";
  /** 表示条件 */
  showWhen?: "always" | "has-content";
  /** ボード表示条件（メモエディター用） */
  showBoards?: boolean;
  /** 上マージン追加（メモエディター用） */
  topMargin?: boolean;
}

export default function BoardTagDisplay({
  boards,
  tags,
  className = "",
  spacing = "normal",
  showWhen = "has-content",
  showBoards = true,
  topMargin = false,
}: BoardTagDisplayProps) {
  const hasContent = (showBoards && boards.length > 0) || tags.length > 0;

  // 表示条件チェック
  if (showWhen === "has-content" && !hasContent) {
    return null;
  }

  // スペーシング設定
  const spacingClasses = {
    tight: "mb-1",
    normal: "mb-4",
    loose: "mb-6",
  };

  return (
    <div className={`${spacingClasses[spacing]} min-h-[28px] ${className}`}>
      <div className="flex flex-wrap gap-2">
        {/* ボード名 */}
        {showBoards && boards.length > 0 && (
          <BoardChips boards={boards} variant="compact" />
        )}
        {/* タグ */}
        {tags.map((tag) => (
          <div
            key={tag.id}
            className="inline-flex items-center px-2 py-1 rounded-md text-xs overflow-hidden"
            style={{
              backgroundColor: tag.color || TAG_COLORS.background,
              color: TAG_COLORS.text,
            }}
          >
            <span>{tag.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
