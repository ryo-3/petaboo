import CustomSelector from "@/components/ui/selectors/custom-selector";
import type { BoardCategory } from "@/src/types/board-categories";
import CreateCategoryModal from "./create-category-modal";
import { useState } from "react";

interface BoardCategorySelectorProps {
  value: number | null;
  onChange: (value: number | null) => void;
  categories: BoardCategory[];
  boardId: number;
  teamId?: number;
  disabled?: boolean;
  allowCreate?: boolean;
  hideChevron?: boolean;
  compactMode?: boolean;
}

export default function BoardCategorySelector({
  value,
  onChange,
  categories,
  boardId,
  teamId,
  disabled = false,
  allowCreate = false,
  hideChevron = false,
  compactMode = false,
}: BoardCategorySelectorProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const options = categories.map((category) => ({
    value: category.id.toString(),
    label: category.name,
  }));

  // 現在選択されているカテゴリーを取得
  const selectedCategory = value
    ? categories.find((cat) => cat.id === value)
    : null;

  // オプションを再構築：未選択、現在の選択、その他の順番で並べる
  const reorderedOptions = [];

  // 1. 未選択を最初に追加（ラベルをプレースホルダー形式に変更）
  reorderedOptions.push({
    value: "",
    label: "ボードカテゴリー",
  });

  // 2. 現在選択されているカテゴリーがあれば次に追加
  if (selectedCategory) {
    reorderedOptions.push({
      value: selectedCategory.id.toString(),
      label: selectedCategory.name,
    });
  }

  // 3. その他のカテゴリーを追加（選択中のものは除く）
  const otherOptions = options.filter(
    (option) => option.value !== "" && option.value !== value?.toString(),
  );
  reorderedOptions.push(...otherOptions);

  // 新規作成オプションを追加
  if (allowCreate) {
    reorderedOptions.push({
      value: "create_new",
      label: "新規作成・編集",
    });
  }

  const handleCategoryCreated = (categoryId: number) => {
    onChange(categoryId);
  };

  return (
    <>
      <CustomSelector
        label="ボードカテゴリー"
        options={reorderedOptions}
        value={value?.toString() || ""}
        onChange={(selectedValue) => {
          if (selectedValue === "create_new") {
            setIsModalOpen(true);
          } else {
            onChange(selectedValue ? parseInt(selectedValue) : null);
          }
        }}
        fullWidth
        disabled={disabled}
        hideLabel={true}
        hideChevron={hideChevron}
        compactMode={compactMode}
      />

      <CreateCategoryModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handleCategoryCreated}
        existingCategories={categories}
        boardId={boardId}
        teamId={teamId}
        currentCategoryId={value}
        onCategorySelect={onChange}
      />
    </>
  );
}
