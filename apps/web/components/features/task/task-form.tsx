"use client";

import PhotoButton from "@/components/ui/buttons/photo-button";
import SaveButton from "@/components/ui/buttons/save-button";
import DateInput from "@/components/ui/inputs/date-input";
import CustomSelector from "@/components/ui/selectors/custom-selector";
import { useUserPreferences } from "@/src/hooks/use-user-preferences";
import {
  getPriorityEditorColor,
  getPriorityText,
  getStatusEditorColor,
  getStatusText,
} from "@/src/utils/taskUtils";
import { useEffect, useRef, useState } from "react";

interface TaskFormProps {
  title: string;
  onTitleChange: (value: string) => void;
  description: string;
  onDescriptionChange: (value: string) => void;
  status: "todo" | "in_progress" | "completed";
  onStatusChange: (value: "todo" | "in_progress" | "completed") => void;
  priority: "low" | "medium" | "high";
  onPriorityChange: (value: "low" | "medium" | "high") => void;
  category: string;
  onCategoryChange: (value: string) => void;
  dueDate: string;
  onDueDateChange: (value: string) => void;
  onSave: () => void;
  isSaving: boolean;
  hasChanges?: boolean;
  savedSuccessfully?: boolean;
  isNewTask?: boolean;
  titlePlaceholder?: string;
  descriptionPlaceholder?: string;
  customHeight?: string;
}

function TaskForm({
  title,
  onTitleChange,
  description,
  onDescriptionChange,
  status,
  onStatusChange,
  priority,
  onPriorityChange,
  category,
  onCategoryChange,
  dueDate,
  onDueDateChange,
  onSave,
  isSaving,
  hasChanges = true,
  savedSuccessfully = false,
  isNewTask = false,
  titlePlaceholder = "タスクタイトルを入力...",
  descriptionPlaceholder = "入力...",
  customHeight,
}: TaskFormProps) {
  const { preferences } = useUserPreferences(1);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const descriptionTextareaRef = useRef<HTMLTextAreaElement>(null);

  // カテゴリー管理用state（後でAPIから取得）
  const [categories, setCategories] = useState([
    { value: "", label: "未選択" },
    { value: "work", label: "仕事" },
    { value: "personal", label: "個人" },
    { value: "study", label: "勉強" },
  ]);

  // 新規作成時のフォーカス遅延
  useEffect(() => {
    if (isNewTask) {
      const timer = setTimeout(() => {
        titleInputRef.current?.focus();
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [isNewTask]);

  // カテゴリー追加ハンドラー
  const handleCreateCategory = (newCategoryName: string) => {
    const newCategory = {
      value: newCategoryName.toLowerCase().replace(/\s+/g, "_"),
      label: newCategoryName,
    };
    setCategories((prev) => [...prev, newCategory]);
    onCategoryChange(newCategory.value);
  };

  // オプションの定義（色はtaskUtilsから取得）
  const statusOptions = [
    {
      value: "todo",
      label: getStatusText("todo"),
      color: getStatusEditorColor("todo"),
    },
    {
      value: "in_progress",
      label: getStatusText("in_progress"),
      color: getStatusEditorColor("in_progress"),
    },
    {
      value: "completed",
      label: getStatusText("completed"),
      color: getStatusEditorColor("completed"),
    },
  ];

  const priorityOptions = [
    {
      value: "low",
      label: getPriorityText("low"),
      color: getPriorityEditorColor("low"),
    },
    {
      value: "medium",
      label: getPriorityText("medium"),
      color: getPriorityEditorColor("medium"),
    },
    {
      value: "high",
      label: getPriorityText("high"),
      color: getPriorityEditorColor("high"),
    },
  ];

  return (
    <>
      <div className="flex items-center gap-3">
        <input
          ref={titleInputRef}
          type="text"
          placeholder={titlePlaceholder}
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && isNewTask) {
              e.preventDefault();
              if (descriptionTextareaRef.current) {
                descriptionTextareaRef.current.focus();
                descriptionTextareaRef.current.scrollIntoView({
                  behavior: "smooth",
                  block: "center",
                });
              }
            }
          }}
          className="flex-1 text-lg font-medium border-b border-DeepBlue outline-none pb-2 focus:border-DeepBlue"
        />
      </div>

      <div className="flex gap-2.5">
        <CustomSelector
          label="ステータス"
          options={statusOptions}
          value={status}
          onChange={(value) =>
            onStatusChange(value as "todo" | "in_progress" | "completed")
          }
          fullWidth
        />

        <CustomSelector
          label="優先度"
          options={priorityOptions}
          value={priority}
          onChange={(value) =>
            onPriorityChange(value as "low" | "medium" | "high")
          }
          fullWidth
        />

        <div className="flex-1 flex gap-2.5 items-center">
          <div className="w-4/12">
            <CustomSelector
              label="カテゴリー"
              options={categories}
              value={category}
              onChange={onCategoryChange}
              fullWidth
              allowCreate={true}
              onCreateNew={handleCreateCategory}
            />
          </div>
          <div className="w-4/12">
          {/* ここはまだダミー あとでボード選択が入る*/}
            <CustomSelector
              label="ボード"
              options={categories}
              value={category}
              onChange={onCategoryChange}
              fullWidth
              allowCreate={true}
              onCreateNew={handleCreateCategory}
            />
          </div>

          <div className="flex-1">
            <DateInput
              label="期限日"
              value={dueDate}
              onChange={onDueDateChange}
              fullWidth
            />
          </div>
        </div>
      </div>

      <div className="mt-2">
        <textarea
          ref={descriptionTextareaRef}
          placeholder={descriptionPlaceholder}
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value)}
          className={`w-full ${customHeight || (preferences?.hideHeader ? "h-[calc(100vh-246px)]" : "h-[calc(100vh-310px)]")} p-3 border border-gray-400 rounded-lg resize-none outline-none text-gray-700 leading-relaxed focus:border-DeepBlue`}
        />
      </div>

      <div className="mt-2 flex justify-start gap-2">
        <SaveButton
          onClick={onSave}
          disabled={!hasChanges || (!title.trim() && !isNewTask)}
          isSaving={isSaving}
          savedSuccessfully={savedSuccessfully}
        />
        <PhotoButton />
      </div>
    </>
  );
}

export default TaskForm;
