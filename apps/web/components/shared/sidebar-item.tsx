"use client";

import { ReactNode } from "react";
import PenIcon from "@/components/icons/pen-icon";
import TrashIcon from "@/components/icons/trash-icon";
import Tooltip from "@/components/ui/base/tooltip";

interface SidebarItemProps {
  isSelected?: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onDelete: () => void;
  children: ReactNode;
  className?: string;
}

function SidebarItem({
  isSelected = false,
  onSelect,
  onEdit,
  onDelete,
  children,
  className = "",
}: SidebarItemProps) {
  return (
    <div
      className={`relative flex p-2 rounded transition-colors group ${
        isSelected ? "bg-Green/10 hover:bg-Green/20" : "hover:bg-gray-100"
      } ${className}`}
    >
      <div className="flex-1 min-w-0 cursor-pointer" onClick={onSelect}>
        {children}
      </div>
      <div className="flex-shrink-0 ml-2 flex flex-col justify-between self-stretch opacity-0 group-hover:opacity-100 transition-opacity">
        <Tooltip text="編集" position="bottom">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
            className="flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors rounded"
          >
            <PenIcon className="w-3 h-3" />
          </button>
        </Tooltip>
        <Tooltip text="削除" position="bottom">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="flex items-center justify-center text-gray-400 hover:text-red-500 transition-colors rounded self-end"
          >
            <TrashIcon className="w-3 h-3" />
          </button>
        </Tooltip>
      </div>
    </div>
  );
}

export default SidebarItem;
