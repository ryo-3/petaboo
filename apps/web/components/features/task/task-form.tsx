"use client";

import PhotoButton from "@/components/ui/buttons/photo-button";
import SaveButton from "@/components/ui/buttons/save-button";
import DateInput from "@/components/ui/inputs/date-input";
import CustomSelector from "@/components/ui/selectors/custom-selector";
import {
  getCategoryEditorColor,
  getPriorityEditorColor,
  getPriorityText,
  getStatusEditorColor,
  getStatusText,
} from "@/src/utils/taskUtils";
import { useUserPreferences } from "@/src/hooks/use-user-preferences";
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
  const { preferences } = useUserPreferences(1);
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

  const categoryOptions = [
    { value: "", label: "未選択", color: getCategoryEditorColor("") },
    { value: "work", label: "仕事", color: getCategoryEditorColor("work") },
    {
      value: "personal",
      label: "個人",
      color: getCategoryEditorColor("personal"),
    },
    { value: "study", label: "勉強", color: getCategoryEditorColor("study") },
    { value: "health", label: "健康", color: getCategoryEditorColor("health") },
    { value: "hobby", label: "趣味", color: getCategoryEditorColor("hobby") },
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
          className={`w-full ${preferences?.hideHeader ? 'h-[calc(100vh-246px)]' : 'h-[calc(100vh-310px)]'} p-3 border border-gray-400 rounded-lg resize-none outline-none text-gray-700 leading-relaxed focus:border-DeepBlue`}
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
