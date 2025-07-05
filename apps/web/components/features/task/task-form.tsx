"use client";

import PhotoButton from "@/components/ui/buttons/photo-button";
import SaveButton from "@/components/ui/buttons/save-button";
import DateInput from "@/components/ui/inputs/date-input";
import CustomSelector from "@/components/ui/selectors/custom-selector";
import { useEffect, useRef } from "react";

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
}: TaskFormProps) {
  const titleInputRef = useRef<HTMLInputElement>(null);
  const descriptionTextareaRef = useRef<HTMLTextAreaElement>(null);

  // 新規作成時のフォーカス遅延
  useEffect(() => {
    if (isNewTask) {
      const timer = setTimeout(() => {
        titleInputRef.current?.focus();
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [isNewTask]);

  const statusOptions = [
    { value: "todo", label: "未着手", color: "bg-zinc-500" },
    {
      value: "in_progress",
      label: "進行中",
      color: "bg-blue-600",
    },
    { value: "completed", label: "完了", color: "bg-green-600" },
  ];

  const priorityOptions = [
    { value: "low", label: "低", color: "bg-green-500" },
    { value: "medium", label: "中", color: "bg-yellow-500" },
    { value: "high", label: "高", color: "bg-red-500" },
  ];

  const categoryOptions = [
    { value: "", label: "未選択", color: "bg-gray-400" },
    { value: "work", label: "仕事", color: "bg-blue-500" },
    { value: "personal", label: "個人", color: "bg-purple-500" },
    { value: "study", label: "勉強", color: "bg-indigo-500" },
    { value: "health", label: "健康", color: "bg-pink-500" },
    { value: "hobby", label: "趣味", color: "bg-orange-500" },
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

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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

        <CustomSelector
          label="カテゴリー"
          options={categoryOptions}
          value={category}
          onChange={onCategoryChange}
          fullWidth
        />

        <DateInput
          label="期限日"
          value={dueDate}
          onChange={onDueDateChange}
          fullWidth
        />
      </div>

      <div className="mt-2">
        <textarea
          ref={descriptionTextareaRef}
          placeholder={descriptionPlaceholder}
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value)}
          className="w-full h-[calc(100vh-400px)] p-3 border border-gray-400 rounded-lg resize-none outline-none text-gray-700 leading-relaxed focus:border-DeepBlue"
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
