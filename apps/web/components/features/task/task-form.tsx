"use client";

import CategorySelector from "@/components/features/category/category-selector";
import DateInput from "@/components/ui/inputs/date-input";
import CustomSelector from "@/components/ui/selectors/custom-selector";
import type { Task } from "@/src/types/task";
import type { Tag } from "@/src/types/tag";
import type { Board } from "@/src/types/board";
import { TAG_COLORS } from "@/src/constants/colors";
import {
  getPriorityEditorColor,
  getPriorityText,
  getStatusEditorColor,
  getStatusText,
} from "@/src/utils/taskUtils";
import { useEffect, useRef, forwardRef, useImperativeHandle } from "react";

interface TaskFormProps {
  task?: Task | null;
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
  isNewTask?: boolean;
  titlePlaceholder?: string;
  descriptionPlaceholder?: string;
  customHeight?: string;
  tags?: Tag[];
  boards?: Board[];
}

export interface TaskFormHandle {
  focusTitle: () => void;
}

const TaskForm = forwardRef<TaskFormHandle, TaskFormProps>((props, ref) => {
  const {
    task, // eslint-disable-line @typescript-eslint/no-unused-vars
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
    isNewTask = false,
    titlePlaceholder = "タスクタイトルを入力...",
    descriptionPlaceholder = "入力...",
    customHeight,
    tags = [],
    boards = [],
  } = props;
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

  // 外部からタイトルにフォーカスを当てるメソッドを公開
  useImperativeHandle(ref, () => ({
    focusTitle: () => {
      titleInputRef.current?.focus();
    }
  }), []);


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
    <div className="flex flex-col flex-1">

      <div className="flex items-center">
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
          className="flex-1 mb-1 mt-1 text-lg font-medium border-b border-DeepBlue/80 outline-none focus:border-DeepBlue"
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
          <div className="w-6/12">
            <CategorySelector
              value={categoryId}
              onChange={onCategoryChange}
              allowCreate={true}
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

      {/* ボード名・タグ表示 */}
      {(boards.length > 0 || tags.length > 0) && (
        <div className="flex flex-wrap gap-2 mt-2">
          {/* ボード名 */}
          {boards.map((board) => (
            <div
              key={board.id}
              className="inline-flex items-center px-2 py-1 rounded-md text-xs overflow-hidden bg-light-Blue text-white"
            >
              <span>{board.name}</span>
            </div>
          ))}
          {/* タグ */}
          {tags.map((tag) => (
            <div
              key={tag.id}
              className="inline-flex items-center px-2 py-1 rounded-md text-xs overflow-hidden"
              style={{ 
                backgroundColor: TAG_COLORS.background, 
                color: TAG_COLORS.text
              }}
            >
              <span>{tag.name}</span>
            </div>
          ))}
        </div>
      )}

      <div className="mt-2 flex-1 flex flex-col">
        <textarea
          ref={descriptionTextareaRef}
          placeholder={descriptionPlaceholder}
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value)}
          className={`w-full ${customHeight || 'flex-1'} resize-none outline-none text-gray-700 leading-relaxed pr-1 pb-10 mb-2`}
        />
      </div>
    </div>
  );
});

TaskForm.displayName = 'TaskForm';

export default TaskForm;
