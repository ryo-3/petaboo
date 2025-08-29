"use client";

import Tooltip from "@/components/ui/base/tooltip";
import DueDateIcon from "@/components/icons/due-date-icon";

interface EditDateToggleProps {
  showEditDate: boolean;
  onToggle: (show: boolean) => void;
  buttonSize: string;
  iconSize: string;
}

function EditDateToggle({
  showEditDate,
  onToggle,
  buttonSize,
  iconSize,
}: EditDateToggleProps) {
  return (
    <Tooltip
      text={showEditDate ? "編集日を非表示" : "編集日を表示"}
      position="bottom"
    >
      <button
        onClick={() => onToggle(!showEditDate)}
        className={`bg-gray-100 shadow-sm rounded-lg ${buttonSize} flex items-center justify-center transition-all ${
          showEditDate
            ? "text-gray-700 opacity-100"
            : "text-gray-500 opacity-65 hover:opacity-85"
        }`}
      >
        <DueDateIcon className={iconSize} />
      </button>
    </Tooltip>
  );
}

export default EditDateToggle;
