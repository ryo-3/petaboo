"use client";

import PhotoButton from "@/components/ui/buttons/photo-button";
import SaveButton from "@/components/ui/buttons/save-button";
import DateInput from "@/components/ui/inputs/date-input";
import CustomSelector from "@/components/ui/selectors/custom-selector";
import CategorySelector from "@/components/features/category/category-selector";
import { useUserPreferences } from "@/src/hooks/use-user-preferences";
import {
  getPriorityEditorColor,
  getPriorityText,
  getStatusEditorColor,
  getStatusText,
} from "@/src/utils/taskUtils";
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
  categoryId: number | null;
  onCategoryChange: (value: number | null) => void;
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
  categoryId,
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
            <CategorySelector
              value={categoryId}
              onChange={onCategoryChange}
              allowCreate={true}
            />
          </div>
          <div className="w-4/12">
          {/* ここはまだダミー あとでボード選択が入る*/}
            <div className="space-y-1.5">
              <label className="text-xs text-gray-600">ボード</label>
              <div className="px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg text-gray-400">
                未実装
              </div>
            </div>
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
