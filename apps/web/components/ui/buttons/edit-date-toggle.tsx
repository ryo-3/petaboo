"use client";

import Tooltip from "@/components/ui/base/tooltip";
import DueDateIcon from "@/components/icons/due-date-icon";

interface EditDateToggleProps {
  showEditDate: boolean;
  onToggle: (show: boolean) => void;
  buttonSize: string;
  iconSize: string;
}

function EditDateToggle({ showEditDate, onToggle, buttonSize, iconSize }: EditDateToggleProps) {
  return (
    <Tooltip text="編集日表示" position="bottom">
      <button
        onClick={() => onToggle(!showEditDate)}
        className={`bg-gray-100 shadow-sm rounded-lg ${buttonSize} flex items-center justify-center transition-colors relative ${
          showEditDate
            ? "text-gray-700"
            : "text-gray-500 hover:text-gray-700"
        }`}
      >
        <DueDateIcon className={iconSize} />
        {!showEditDate && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-3/4 h-0.5 bg-gray-500 -rotate-45 transform origin-center"></div>
          </div>
        )}
      </button>
    </Tooltip>
  );
}

export default EditDateToggle;