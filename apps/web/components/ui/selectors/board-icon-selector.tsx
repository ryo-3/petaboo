import React, { useState, useEffect, useRef } from 'react';
import DashboardIcon from "@/components/icons/dashboard-icon";
import Tooltip from "@/components/ui/base/tooltip";

interface BoardOption {
  value: string;
  label: string;
}

interface BoardIconSelectorProps {
  options: BoardOption[];
  value: string | string[]; // 単一選択と複数選択の両方に対応
  onChange: (value: string | string[]) => void;
  className?: string;
  iconClassName?: string;
  multiple?: boolean; // 複数選択モードのフラグ
}

export default function BoardIconSelector({
  options,
  value,
  onChange,
  className = "",
  iconClassName = "size-4 text-gray-600",
  multiple = false
}: BoardIconSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const selectorRef = useRef<HTMLDivElement>(null);

  // 値を配列として扱う（単一選択の場合も配列に変換）
  const selectedValues = Array.isArray(value) 
    ? value 
    : (value && value !== "" ? [value] : []);
  
  console.log('🔍 BoardIconSelector レンダー:', {
    value,
    selectedValues,
    multiple,
    optionsLength: options.length,
    options: options.map(o => ({ value: o.value, label: o.label }))
  });

  

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
    console.log('🔍 BoardIconSelector 選択処理:', {
      optionValue,
      multiple,
      selectedValues,
      isCurrentlySelected: selectedValues.includes(optionValue)
    });
    
    if (multiple) {
      // 複数選択モード
      const newValues = selectedValues.includes(optionValue)
        ? selectedValues.filter(v => v !== optionValue) // 選択解除
        : [...selectedValues, optionValue]; // 選択追加
      
      console.log('🔍 BoardIconSelector 複数選択結果:', newValues);
      onChange(newValues);
    } else {
      // 単一選択モード
      console.log('🔍 BoardIconSelector 単一選択結果:', optionValue);
      onChange(optionValue);
      setIsOpen(false);
    }
  };

  // ボードが選択されているかどうか
  const hasSelectedBoard = selectedValues.length > 0;

  return (
    <div className={`flex items-center gap-1.5 ${className}`} ref={selectorRef}>
      <div className="relative">
        <Tooltip text="ボード選択" position="top">
          <button
            onClick={() => {
              console.log('🔍 BoardIconSelector ボタンクリック:', { isOpen, hasSelectedBoard });
              setIsOpen(!isOpen);
            }}
            className={`flex items-center justify-center size-7 transition-colors rounded-md ${
              hasSelectedBoard 
                ? "bg-light-Blue text-white hover:bg-light-Blue/90" 
                : "bg-gray-100 hover:bg-gray-200"
            }`}
          >
            <DashboardIcon className={`${iconClassName} ${hasSelectedBoard ? "text-white" : "text-gray-600"}`} />
          </button>
        </Tooltip>
        
        {isOpen && (
          <div className="absolute top-full left-0 mt-1 z-50 bg-white rounded-lg shadow-lg border border-gray-300 min-w-[180px]">
            <div className="py-1">
            {options.map((option) => {
              // 複数選択モードでは「なし」オプションをスキップ
              if (multiple && option.value === "") return null;
              
              const isSelected = selectedValues.includes(option.value);
              
              console.log('🔍 BoardIconSelector オプションレンダー:', {
                optionValue: option.value,
                optionLabel: option.label,
                isSelected,
                selectedValues
              });
              
              return (
                <button
                  key={option.value}
                  className="w-full px-3 py-2 text-sm text-left transition-colors flex items-center gap-2 text-gray-700 hover:bg-gray-50"
                  onClick={() => {
                    console.log('🔍 BoardIconSelector オプションクリック:', option.value);
                    handleSelect(option.value);
                  }}
                >
                  {multiple && (
                    <div className={`w-4 h-4 border-2 rounded flex items-center justify-center ${
                      isSelected 
                        ? "bg-light-Blue border-light-Blue" 
                        : "border-gray-300"
                    }`}>
                      {isSelected && (
                        <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                  )}
                  {option.label}
                </button>
              );
            })}
            </div>
          </div>
        )}
      </div>
      
    </div>
  );
}