import CustomSelector from "@/components/ui/selectors/custom-selector";
import type { BoardCategory } from "@/src/types/board-categories";

interface BoardCategorySelectorProps {
  value: number | null;
  onChange: (value: number | null) => void;
  categories: BoardCategory[];
  disabled?: boolean;
  allowCreate?: boolean;
}

export default function BoardCategorySelector({
  value,
  onChange,
  categories,
  disabled = false,
  allowCreate = false,
}: BoardCategorySelectorProps) {
  const options = categories.map(category => ({
    value: category.id.toString(),
    label: category.name,
    color: category.color || "#f3f4f6",
  }));

  return (
    <CustomSelector
      label="ボードカテゴリー"
      options={options}
      value={value?.toString() || null}
      onChange={(value) => {
        onChange(value ? parseInt(value) : null);
      }}
      fullWidth
      disabled={disabled}
      allowClear
      placeholder="カテゴリーを選択..."
    />
  );
}