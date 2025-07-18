import React, { useState, useEffect, useRef } from 'react';
import DashboardIcon from "@/components/icons/dashboard-icon";

interface BoardOption {
  value: string;
  label: string;
}

interface BoardIconSelectorProps {
  options: BoardOption[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
  iconClassName?: string;
}

export default function BoardIconSelector({
  options,
  value,
  onChange,
  className = "",
  iconClassName = "size-4 text-gray-600"
}: BoardIconSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const selectorRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find(opt => opt.value === value);

  // 外部クリックで閉じる
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (selectorRef.current && !selectorRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isOpen]);

  const handleSelect = (optionValue: string) => {
    onChange(optionValue);
    setIsOpen(false);
  };

  return (
    <div className={`relative ${className}`} ref={selectorRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-center size-7 bg-gray-100 hover:bg-gray-200 transition-colors rounded-md"
      >
        <DashboardIcon className={iconClassName} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 z-50 bg-white rounded-lg shadow-lg border border-gray-300 min-w-[180px]">
          <div className="py-1">
            {options.map((option) => (
              <button
                key={option.value}
                className={`w-full px-3 py-2 text-sm text-left transition-colors ${
                  option.value === value 
                    ? "bg-gray-100 text-gray-900" 
                    : "text-gray-700 hover:bg-gray-50"
                }`}
                onClick={() => handleSelect(option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}