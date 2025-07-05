import React, { useState } from 'react';
import ChevronDownIcon from "@/components/icons/chevron-down-icon";

interface SelectorOption {
  value: string;
  label: string;
  color: string;
}

interface CustomSelectorProps {
  label: string;
  options: SelectorOption[];
  value: string;
  onChange: (value: string) => void;
  fullWidth?: boolean;
  width?: string;
  dropdownWidth?: string;
}

function CustomSelector({
  label,
  options,
  value,
  onChange,
  fullWidth = false,
  width = "82px",
  dropdownWidth = "118px"
}: CustomSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  
  const selectedOption = options.find(opt => opt.value === value);
  
  const handleSelect = (optionValue: string) => {
    onChange(optionValue);
    setIsOpen(false);
  };

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {label}
      </label>
      <div className="relative">
        <div
          className={`flex items-center cursor-pointer bg-white px-1 py-1 border border-gray-400 ${
            isOpen ? "rounded-t-lg" : "rounded-lg"
          } ${fullWidth ? "w-full" : ""}`}
          style={fullWidth ? {} : { width }}
          onClick={() => setIsOpen(!isOpen)}
          title="クリックして変更"
        >
          <div className="px-2 py-1 text-sm hover:opacity-80 transition-opacity flex items-center gap-2 flex-1">
            <div className={`w-3 h-3 rounded-full ${selectedOption?.color}`}></div>
            {selectedOption?.label}
          </div>
          <ChevronDownIcon 
            className={`w-3 h-3 mr-1 transition-transform ${isOpen ? "rotate-180" : ""}`}
          />
        </div>

        {isOpen && (
          <div
            className={`absolute top-full left-0 z-10 bg-white rounded-lg shadow-lg border border-gray-400 border-t-0 rounded-t-none ${
              fullWidth ? "w-full" : ""
            }`}
            style={fullWidth ? {} : { width: dropdownWidth }}
          >
            <div className="p-2 space-y-1">
              {options.map((option) => (
                <div key={option.value}>
                  <button
                    className={`w-full px-3 py-2 text-sm transition-all text-left flex items-center gap-2 rounded-md ${
                      option.value === value 
                        ? `bg-gray-100` 
                        : `hover:bg-gray-50`
                    }`}
                    onClick={() => handleSelect(option.value)}
                  >
                    <div className={`w-3 h-3 rounded-full ${option.color}`}></div>
                    {option.label}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default CustomSelector;