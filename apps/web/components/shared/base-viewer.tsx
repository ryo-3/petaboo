"use client";

import React, { ReactNode } from "react";
import DateInfo from "@/components/shared/date-info";
import type { Memo } from "@/src/types/memo";
import type { Task } from "@/src/types/task";

interface BaseViewerProps {
  item: Memo | Task;
  onClose: () => void;
  headerActions?: ReactNode;
  children: ReactNode;
  error?: string | null;
  isEditing?: boolean;
  createdItemId?: number | null;
  lastEditedAt?: number | null;
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
}: BaseViewerProps) {
  return (
    <div className="flex flex-col h-full bg-white p-2">
      <DateInfo item={item} isEditing={isEditing} createdItemId={createdItemId} lastEditedAt={lastEditedAt} />
      
      <div className="flex justify-start items-center">
        {headerActions}
        
        <div className="flex items-center gap-3 ml-auto">
          {error && <span className="text-sm text-red-500">{error}</span>}
        </div>

      </div>

      <div className="flex flex-col gap-2 flex-1">
        {children}
      </div>
    </div>
  );
}

export default BaseViewer;