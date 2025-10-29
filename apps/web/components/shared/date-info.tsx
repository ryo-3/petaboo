"use client";

import type { Memo, DeletedMemo } from "@/src/types/memo";
import type { Task, DeletedTask } from "@/src/types/task";
import { formatDate } from "@/src/utils/formatDate";

interface DateInfoProps {
  item?: Memo | Task | DeletedMemo | DeletedTask | null;
  createdItemId?: number | null;
  isEditing?: boolean;
  lastEditedAt?: number | null;
  size?: "sm" | "md";
}

function DateInfo({
  item,
  createdItemId,
  isEditing = false,
  lastEditedAt,
  size = "md",
}: DateInfoProps) {
  if (!item) {
    return null;
  }

  // 最新の編集時間を決定（propsの編集時間 vs API更新時間）
  const latestEditTime =
    lastEditedAt && lastEditedAt > (item.updatedAt || 0)
      ? lastEditedAt
      : item.updatedAt;

  // 新規作成時または実際に編集されていない場合は編集時間を表示しない
  const showEditTime =
    !createdItemId &&
    latestEditTime &&
    latestEditTime !== item.createdAt &&
    item.updatedAt !== item.createdAt;

  const textSizeClass =
    size === "sm" ? "text-[12px]" : "text-[12px] md:text-[14px]";
  const gapClass = size === "sm" ? "gap-3" : "gap-4";

  return (
    <div className={`${textSizeClass} text-gray-500`}>
      <div className={`flex ${gapClass}`}>
        <span>作成 {formatDate(item.createdAt)}</span>
        {showEditTime && <span>編集 {formatDate(latestEditTime)}</span>}
      </div>
    </div>
  );
}

export default DateInfo;
