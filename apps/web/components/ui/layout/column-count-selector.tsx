interface ColumnCountSelectorProps {
  columnCount: number;
  onColumnCountChange: (count: number) => void;
  isRightPanelShown?: boolean;
  disabled?: boolean;
  containerHeight: string;
  buttonSize: string;
}

function ColumnCountSelector({
  columnCount,
  onColumnCountChange,
  isRightPanelShown = false,
  disabled = false,
  containerHeight,
  buttonSize,
}: ColumnCountSelectorProps) {
  return (
    <div className={`flex items-center gap-1 bg-gray-100 rounded-lg ${containerHeight} p-1`}>
      {[1, 2, 3, 4].map((count) => {
        // 右側表示時: 3と4は非表示
        if (isRightPanelShown && (count === 3 || count === 4)) return null;

        return (
          <button
            key={count}
            onClick={() => onColumnCountChange(count)}
            disabled={disabled}
            className={`${buttonSize} font-medium text-xs rounded-lg transition-colors ${
              (!isRightPanelShown && columnCount === count) || // 通常時
              (isRightPanelShown &&
                columnCount <= 2 &&
                columnCount === count) || // 右側表示時の1-2列
              (isRightPanelShown && columnCount >= 3 && count === 2) // 右側表示時の3-4列→2列表示
                ? "bg-white text-gray-700 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            {count}
          </button>
        );
      })}
    </div>
  );
}

export default ColumnCountSelector;
