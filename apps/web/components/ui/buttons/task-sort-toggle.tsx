"use client";

import Tooltip from "@/components/ui/base/tooltip";
import CreatedAtIcon from "@/components/icons/created-at-icon";
import UpdatedAtIcon from "@/components/icons/updated-at-icon";
import PriorityIcon from "@/components/icons/priority-icon";
import ArrowDownIcon from "@/components/icons/arrow-down-icon";
import ArrowUpIcon from "@/components/icons/arrow-up-icon";

interface SortOption {
  id: "createdAt" | "updatedAt" | "priority";
  label: string;
  enabled: boolean;
  direction: "asc" | "desc";
}

interface TaskSortToggleProps {
  sortOptions: SortOption[];
  onSortChange: (options: SortOption[]) => void;
  buttonSize: string;
  iconSize: string;
  arrowSize?: string;
}

function TaskSortToggle({ sortOptions, onSortChange, buttonSize, iconSize, arrowSize = "w-2.5 h-3" }: TaskSortToggleProps) {
  const getSortIcon = (id: string) => {
    switch (id) {
      case "createdAt":
        return <CreatedAtIcon className={iconSize} />;
      case "updatedAt":
        return <UpdatedAtIcon className={iconSize} />;
      case "priority":
        return <PriorityIcon className={iconSize} />;
    }
  };

  const getDirectionIcon = (direction: "asc" | "desc") => {
    return direction === "desc" ? <ArrowDownIcon className={arrowSize} /> : <ArrowUpIcon className={arrowSize} />;
  };

  return (
    <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1 h-7">
      {sortOptions.map((option) => {
        const handleToggle = () => {
          const updatedOptions = sortOptions.map((opt) => {
            if (opt.id === option.id) {
              if (!opt.enabled) {
                // 無効 → 昇順
                return { ...opt, enabled: true, direction: "asc" as const };
              } else if (opt.direction === "asc") {
                // 昇順 → 降順
                return { ...opt, direction: "desc" as const };
              } else {
                // 降順 → 無効
                return { ...opt, enabled: false };
              }
            }
            return opt;
          });
          onSortChange(updatedOptions);
        };

        return (
          <Tooltip
            key={option.id}
            text={`${option.label}${option.enabled ? ` (${option.direction === "desc" ? "降順" : "昇順"})` : ""}`}
            position="bottom"
          >
            <button
              onClick={handleToggle}
              className={`${buttonSize} flex items-center justify-center rounded transition-colors relative ${
                option.enabled
                  ? "text-gray-700 bg-white shadow-sm"
                  : "text-gray-400 hover:text-gray-600"
              }`}
            >
              {getSortIcon(option.id)}
              {option.enabled && (
                <div className="absolute -top-1 -right-0.5 text-gray-600">
                  {getDirectionIcon(option.direction)}
                </div>
              )}
            </button>
          </Tooltip>
        );
      })}
    </div>
  );
}

export default TaskSortToggle;