"use client";

import Tooltip from "@/components/ui/base/tooltip";
import SortIcon from "@/components/icons/sort-icon";
import CreatedAtIcon from "@/components/icons/created-at-icon";
import UpdatedAtIcon from "@/components/icons/updated-at-icon";
import DueDateIcon from "@/components/icons/due-date-icon";
import PriorityIcon from "@/components/icons/priority-icon";
import { useState } from "react";

interface SortOption {
  id: "createdAt" | "updatedAt" | "dueDate" | "priority";
  label: string;
  enabled: boolean;
}

interface SortToggleProps {
  sortOptions: SortOption[];
  onSortChange: (options: SortOption[]) => void;
  buttonSize: string;
  iconSize: string;
}

function TaskSortToggle({ sortOptions, onSortChange, buttonSize, iconSize }: SortToggleProps) {
  const [showSortOptions, setShowSortOptions] = useState(false);

  const getSortIcon = (id: string) => {
    switch (id) {
      case "createdAt":
        return <CreatedAtIcon className={iconSize} />;
      case "updatedAt":
        return <UpdatedAtIcon className={iconSize} />;
      case "dueDate":
        return <DueDateIcon className={iconSize} />;
      case "priority":
        return <PriorityIcon className={iconSize} />;
    }
  };

  return (
    <div className="flex items-center gap-1">
      <Tooltip text="並び替え" position="bottom">
        <button
          onClick={() => setShowSortOptions(!showSortOptions)}
          className={`bg-gray-100 rounded-lg ${buttonSize} flex items-center justify-center transition-colors ${
            sortOptions.some((opt) => opt.enabled)
              ? "text-gray-700"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          <SortIcon className={iconSize} />
        </button>
      </Tooltip>

      {showSortOptions && (
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1 py-1">
          {sortOptions.map((option) => {
            const handleToggle = () => {
              const updatedOptions = sortOptions.map((opt) =>
                opt.id === option.id
                  ? { ...opt, enabled: !opt.enabled }
                  : opt
              );
              onSortChange(updatedOptions);
            };

            return (
              <Tooltip
                key={option.id}
                text={option.label}
                position="bottom"
              >
                <button
                  onClick={handleToggle}
                  className={`size-7 flex items-center justify-center rounded transition-colors ${
                    option.enabled
                      ? "text-gray-700 bg-white shadow-sm"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  {getSortIcon(option.id)}
                </button>
              </Tooltip>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default TaskSortToggle;