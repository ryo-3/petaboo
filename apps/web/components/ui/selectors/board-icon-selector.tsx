import React, { useState } from "react";
import DashboardIcon from "@/components/icons/dashboard-icon";
import Tooltip from "@/components/ui/base/tooltip";
import BoardSelectionModal from "@/components/ui/modals/board-selection-modal";

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
  disabled?: boolean; // 無効化フラグ
}

export default function BoardIconSelector({
  options,
  value,
  onChange,
  className = "",
  iconClassName = "size-4 text-gray-600",
  multiple = false,
  disabled = false,
}: BoardIconSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);

  // 値を配列として扱う（単一選択の場合も配列に変換）
  const selectedValues = Array.isArray(value)
    ? value.filter((v) => v !== "") // 空文字列を除外
    : value && value !== ""
      ? [value]
      : [];

  // 🔍 BoardIconSelector内部のログ
  console.log("🎯 [BoardIconSelector] 内部状態:", {
    受信value: value,
    isArray: Array.isArray(value),
    selectedValues,
    selectedValuesLength: selectedValues.length,
    hasSelectedBoard: selectedValues.length > 0,
    multiple,
    disabled,
  });

  // BoardSelectionModal用のデータ変換
  const boards = options
    .filter((opt) => opt.value !== "") // "なし"オプションを除外
    .map((opt) => ({
      id: parseInt(opt.value, 10),
      name: opt.label,
    }));

  const selectedBoardIds = selectedValues.map((v) => parseInt(v, 10));

  const handleSelectionChange = (boardIds: number[]) => {
    const stringValues = boardIds.map((id) => id.toString());
    const result = multiple ? stringValues : stringValues[0] || "";
    onChange(result);
  };

  // ボードが選択されているかどうか（空配列なら false）
  const hasSelectedBoard = selectedValues.length > 0;

  return (
    <>
      <div className={`flex items-center gap-1.5 ${className}`}>
        <div className="relative">
          <Tooltip
            text={disabled ? "ボード表示（読み取り専用）" : "ボード選択"}
            position="bottom"
          >
            <button
              onClick={
                disabled
                  ? undefined
                  : () => {
                      setIsOpen(true);
                    }
              }
              disabled={disabled}
              className={`flex items-center justify-center size-7 rounded-md ${
                disabled
                  ? "bg-gray-50 cursor-not-allowed"
                  : hasSelectedBoard
                    ? "bg-light-Blue text-white"
                    : "bg-gray-100"
              }`}
            >
              <DashboardIcon
                className={`${iconClassName} ${
                  disabled
                    ? "text-gray-400"
                    : hasSelectedBoard
                      ? "text-white"
                      : "text-gray-600"
                }`}
              />
            </button>
          </Tooltip>
        </div>
      </div>

      {/* ボード選択モーダル */}
      <BoardSelectionModal
        isOpen={isOpen && !disabled}
        onClose={() => setIsOpen(false)}
        boards={boards}
        selectedBoardIds={selectedBoardIds}
        onSelectionChange={handleSelectionChange}
        mode="selection"
        multiple={multiple}
        title="ボード選択"
      />
    </>
  );
}
