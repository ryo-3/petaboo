import { useState } from "react";
import { useCategories, useCreateCategory } from "@/src/hooks/use-categories";
import CustomSelector from "@/components/ui/selectors/custom-selector";

interface CategorySelectorProps {
  value?: number | null;
  onChange: (categoryId: number | null) => void;
  allowCreate?: boolean;
  placeholder?: string;
  className?: string;
}

export default function CategorySelector({
  value,
  onChange,
  allowCreate = true,
  className,
}: CategorySelectorProps) {
  const { data: categories = [], isLoading } = useCategories();
  const createCategory = useCreateCategory();
  const [isCreating, setIsCreating] = useState(false);

  // セレクター用のオプションを準備（string型に変換）
  const options = [
    { value: "", label: "カテゴリーなし" },
    ...categories.map((category) => ({
      value: category.id.toString(),
      label: category.name,
    })),
  ];

  // 現在の値をstring型に変換
  const currentValue = value ? value.toString() : "";

  // 新しいカテゴリー作成ハンドラー
  const handleCreateCategory = async (newCategoryName: string) => {
    setIsCreating(true);
    try {
      const newCategory = await createCategory.mutateAsync({ name: newCategoryName.trim() });
      onChange(newCategory.id);
    } catch (error) {
      console.error("カテゴリー作成エラー:", error);
      alert("カテゴリーの作成に失敗しました");
    }
    setIsCreating(false);
  };

  // セレクターの変更ハンドラー
  const handleSelectionChange = (selectedValue: string) => {
    if (selectedValue === "") {
      onChange(null);
    } else {
      onChange(parseInt(selectedValue));
    }
  };

  return (
    <div className={className}>
      <CustomSelector
        label="カテゴリー"
        options={options}
        value={currentValue}
        onChange={handleSelectionChange}
        fullWidth
        allowCreate={allowCreate}
        onCreateNew={handleCreateCategory}
      />
    </div>
  );
}