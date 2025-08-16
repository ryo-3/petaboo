import CustomSelector from "@/components/ui/selectors/custom-selector";
import type { BoardCategory } from "@/src/types/board-categories";
import CreateCategoryModal from "./create-category-modal";
import { useState } from "react";
import { Plus } from "lucide-react";

interface BoardCategorySelectorProps {
  value: number | null;
  onChange: (value: number | null) => void;
  categories: BoardCategory[];
  boardId: number;
  disabled?: boolean;
  allowCreate?: boolean;
}

export default function BoardCategorySelector({
  value,
  onChange,
  categories,
  boardId,
  disabled = false,
  allowCreate = false,
}: BoardCategorySelectorProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const options = categories.map(category => ({
    value: category.id.toString(),
    label: category.name,
  }));

  // 新規作成オプションを一番上に追加
  if (allowCreate) {
    options.unshift({
      value: "create_new",
      label: "新規作成"
    });
  }

  const handleCategoryCreated = (categoryId: number) => {
    onChange(categoryId);
  };

  return (
    <>
      <CustomSelector
        label="ボードカテゴリー"
        options={options}
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
      />

      <CreateCategoryModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handleCategoryCreated}
        existingCategories={categories}
        boardId={boardId}
      />
    </>
  );
}