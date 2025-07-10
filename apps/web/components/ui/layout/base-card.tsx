import { ReactNode } from "react";

interface BaseCardProps {
  isChecked: boolean;
  onToggleCheck: () => void;
  onSelect: () => void;
  variant?: "normal" | "deleted";
  isSelected?: boolean;
  children: ReactNode;
  dataTaskId?: number | string;
  dataMemoId?: number | string;
  isDeleting?: boolean;
}

function BaseCard({
  isChecked,
  onToggleCheck,
  onSelect,
  variant = "normal",
  isSelected = false,
  children,
  dataTaskId,
  dataMemoId,
  isDeleting = false,
}: BaseCardProps) {
  const isDeleted = variant === "deleted";

  return (
    <div
      className={`relative transition-opacity duration-300 ${isDeleting ? "opacity-0" : "opacity-100"}`}
      data-task-id={dataTaskId}
      data-memo-id={dataMemoId}
    >
      <button
        onClick={(e) => {
          e.stopPropagation();
          onToggleCheck();
        }}
        className={`absolute top-1.5 right-1.5 size-5 rounded-full border-2 flex items-center justify-center z-10 transition-colors ${
          isChecked
            ? isDeleted
              ? "bg-white border-gray-400"
              : "bg-Green border-Green"
            : "bg-white border-gray-300 hover:border-gray-400"
        }`}
      >
        {isChecked && (
          <svg
            className={`w-3 h-3 ${isDeleted ? "text-black" : "text-white"}`}
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
              clipRule="evenodd"
            />
          </svg>
        )}
      </button>
      <button
        onClick={onSelect}
        className={`${
          isSelected
            ? "bg-gray-100 border border-gray-400"
            : isDeleted
              ? "bg-red-50 border border-red-200 hover:shadow-md hover:border-red-300"
              : "bg-white border border-gray-200 hover:shadow-md hover:border-gray-300"
        } pt-4 pl-4 pb-2 pr-6 rounded-lg transition-all text-left ${
          dataTaskId ? "h-[170px]" : "h-[160px]"
        } w-full`}
      >
        <div className="flex flex-col h-full">{children}</div>
      </button>
    </div>
  );
}

export default BaseCard;
