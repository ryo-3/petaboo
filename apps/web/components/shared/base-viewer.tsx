"use client";

import React, { ReactNode } from "react";
import TrashIcon from "@/components/icons/trash-icon";
import DateInfo from "@/components/shared/date-info";
import type { Memo } from "@/src/types/memo";
import type { Task } from "@/src/types/task";

interface BaseViewerProps {
  item: Memo | Task;
  onClose: () => void;
  onDelete: () => void;
  headerActions?: ReactNode;
  children: ReactNode;
  error?: string | null;
  isEditing?: boolean;
}

function BaseViewer({
  item,
  onClose,
  onDelete,
  headerActions,
  children,
  error,
  isEditing = false,
}: BaseViewerProps) {
  return (
    <div className="flex flex-col h-full bg-white p-2">
      <div className="flex justify-start items-center mb-4">
        {headerActions}
        
        <div className="flex items-center gap-3 ml-auto">
          {error && <span className="text-sm text-red-500">{error}</span>}
        </div>

        <button
          onClick={onDelete}
          className="fixed bottom-6 right-6 bg-gray-500 hover:bg-gray-600 text-white p-3 rounded-full shadow-lg transition-colors"
        >
          <TrashIcon />
        </button>
      </div>

      <div className="flex flex-col gap-4 flex-1">
        <DateInfo item={item} isEditing={isEditing} />
        {children}
      </div>
    </div>
  );
}

export default BaseViewer;