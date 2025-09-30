"use client";

import DateInfo from "@/components/shared/date-info";
import type { Memo } from "@/src/types/memo";
import type { Task } from "@/src/types/task";
import { ReactNode } from "react";

interface BaseViewerProps {
  item: Memo | Task;
  onClose: () => void;
  headerActions?: ReactNode;
  children: ReactNode;
  error?: string | null;
  isEditing?: boolean;
  createdItemId?: number | null;
  lastEditedAt?: number | null;
  hideDateInfo?: boolean; // 日付情報を非表示にするオプション
  topContent?: ReactNode; // 日付情報の上に表示するコンテンツ
  compactPadding?: boolean; // ボード詳細時などでコンパクトなパディングを使用
}

function BaseViewer({
  item,
  onClose: _onClose, // eslint-disable-line @typescript-eslint/no-unused-vars
  headerActions,
  children,
  error,
  isEditing = false,
  createdItemId,
  lastEditedAt,
  hideDateInfo = false,
  topContent,
  compactPadding = false,
}: BaseViewerProps) {
  return (
    <div
      className={`flex flex-col h-full bg-white pl-2 ${compactPadding ? "pt-2" : "pt-3"}`}
    >
      {topContent}
      {!hideDateInfo && (
        <DateInfo
          item={item}
          isEditing={isEditing}
          createdItemId={createdItemId}
          lastEditedAt={lastEditedAt}
        />
      )}

      <div className="flex justify-start items-center">
        {headerActions}

        <div className="flex items-center gap-3 ml-auto">
          {error && <span className="text-sm text-red-500">{error}</span>}
        </div>
      </div>

      <div className="flex flex-col flex-1">{children}</div>
    </div>
  );
}

export default BaseViewer;
