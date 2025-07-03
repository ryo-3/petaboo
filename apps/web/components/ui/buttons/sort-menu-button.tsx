"use client";

import { useState, useRef, useEffect } from "react";
import Tooltip from "@/components/ui/base/tooltip";

interface SortOption {
  id: "createdAt" | "updatedAt" | "dueDate" | "priority";
  label: string;
  enabled: boolean;
}

interface SortMenuButtonProps {
  sortOptions: SortOption[];
  onSortChange: (options: SortOption[]) => void;
}

function SortMenuButton({ sortOptions, onSortChange }: SortMenuButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // クリック外で閉じる
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const handleToggleOption = (id: string) => {
    const updatedOptions = sortOptions.map(option =>
      option.id === id ? { ...option, enabled: !option.enabled } : option
    );
    onSortChange(updatedOptions);
  };

  const handleResetSort = () => {
    const resetOptions = sortOptions.map(option => ({ ...option, enabled: false }));
    onSortChange(resetOptions);
  };

  const hasActiveSort = sortOptions.some(option => option.enabled);

  return (
    <div className="relative" ref={menuRef}>
      <Tooltip
        text="並び替え"
        position="bottom"
      >
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg">
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="p-1.5 rounded transition-colors text-gray-500 hover:text-gray-700"
          >
            <svg
              className={`w-4 h-4 transition-all duration-300 ${
                hasActiveSort ? "text-blue-600" : ""
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"
              />
            </svg>
          </button>
        </div>
      </Tooltip>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 bg-white rounded-lg shadow-lg border border-gray-200 p-2 z-50">
          <div className="flex items-center gap-1">
            {sortOptions.map((option) => {
              const getIcon = () => {
                switch (option.id) {
                  case "createdAt":
                    return (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    );
                  case "updatedAt":
                    return (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    );
                  case "dueDate":
                    return (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    );
                  case "priority":
                    return (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    );
                }
              };

              return (
                <button
                  key={option.id}
                  onClick={() => handleToggleOption(option.id)}
                  className={`p-1.5 rounded transition-colors relative group ${
                    option.enabled 
                      ? "text-blue-600 bg-blue-50" 
                      : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                  }`}
                  title={option.label}
                >
                  {getIcon()}
                  {/* ツールチップ */}
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                    {option.label}
                  </div>
                </button>
              );
            })}
            
            {hasActiveSort && (
              <>
                <div className="w-px h-6 bg-gray-300 mx-1"></div>
                <button
                  onClick={handleResetSort}
                  className="p-1.5 rounded transition-colors text-gray-400 hover:text-gray-600 hover:bg-gray-100 group relative"
                  title="デフォルトに戻す"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  {/* ツールチップ */}
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                    リセット
                  </div>
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default SortMenuButton;