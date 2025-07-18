"use client";

import CategorySelector from "@/components/features/category/category-selector";
import TrashIcon from "@/components/icons/trash-icon";
import PhotoButton from "@/components/ui/buttons/photo-button";
import SaveButton from "@/components/ui/buttons/save-button";
import DateInput from "@/components/ui/inputs/date-input";
import BoardIconSelector from "@/components/ui/selectors/board-icon-selector";
import CustomSelector from "@/components/ui/selectors/custom-selector";
import { useBoards } from "@/src/hooks/use-boards";
import { useUserPreferences } from "@/src/hooks/use-user-preferences";
import {
  getPriorityEditorColor,
  getPriorityText,
  getStatusEditorColor,
  getStatusText,
} from "@/src/utils/taskUtils";
import { useEffect, useMemo, useRef, useState } from "react";

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
  boardId: number | null;
  onBoardChange: (value: number | null) => void;
  dueDate: string;
  onDueDateChange: (value: string) => void;
  onSave: () => void;
  onDelete?: () => void;
  isLidOpen?: boolean;
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
  boardId,
  onBoardChange,
  dueDate,
  onDueDateChange,
  onSave,
  onDelete,
  isLidOpen = false,
  isSaving,
  hasChanges = true,
  savedSuccessfully = false,
  isNewTask = false,
  titlePlaceholder = "タスクタイトルを入力...",
  descriptionPlaceholder = "入力...",
  customHeight,
}: TaskFormProps) {
  const { preferences } = useUserPreferences(1);
  const { data: boards = [] } = useBoards();
  const titleInputRef = useRef<HTMLInputElement>(null);
  const descriptionTextareaRef = useRef<HTMLTextAreaElement>(null);
  const [isTrashHovered, setIsTrashHovered] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  // 新規作成時のフォーカス遅延
  useEffect(() => {
    if (isNewTask) {
      const timer = setTimeout(() => {
        titleInputRef.current?.focus();
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [isNewTask]);

  // 蓋の状態を監視してアニメーション状態を管理
  useEffect(() => {
    if (isLidOpen) {
      setIsAnimating(true);
    } else if (isAnimating) {
      // 蓋が閉じた後、300ms待ってからアニメーション状態をリセット
      const timer = setTimeout(() => {
        setIsAnimating(false);
        // アニメーション完了時にホバー状態もリセット
        setIsTrashHovered(false);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isLidOpen, isAnimating]);

  // BoardIconSelector用のボードオプション
  const boardOptions = useMemo(() => {
    const options = [{ value: "", label: "なし" }];

    boards.forEach((board) => {
      options.push({
        value: board.id.toString(),
        label: board.name,
      });
    });

    return options;
  }, [boards]);

  // 現在選択されているボードのvalue
  const currentBoardValue = boardId ? boardId.toString() : "";

  // ボード選択変更ハンドラー
  const handleBoardSelectorChange = (value: string) => {
    const newBoardId = value ? parseInt(value, 10) : null;
    onBoardChange(newBoardId);
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
      <div className="flex justify-start gap-2">
        <SaveButton
          onClick={onSave}
          disabled={!hasChanges || (!title.trim() && !isNewTask)}
          isSaving={isSaving}
          savedSuccessfully={savedSuccessfully}
          buttonSize="size-7"
          iconSize="size-4"
        />
        <PhotoButton
          buttonSize="size-7"
          iconSize="size-5"
          className="rounded-full"
        />
        <BoardIconSelector
          options={boardOptions}
          value={currentBoardValue}
          onChange={handleBoardSelectorChange}
          iconClassName="size-4 text-gray-600"
        />
        {!isNewTask && onDelete && (
          <button
            onClick={onDelete}
            onMouseEnter={() => setIsTrashHovered(true)}
            onMouseLeave={() => setIsTrashHovered(false)}
            className={`flex items-center justify-center size-7 rounded-md transition-colors duration-200 ${
              isAnimating
                ? "bg-gray-200"
                : isTrashHovered
                  ? "bg-gray-200"
                  : "bg-gray-100"
            }`}
            title="削除"
          >
            <TrashIcon className="size-5" isLidOpen={isLidOpen} />
          </button>
        )}
      </div>

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
          className="flex-1 mb-1 text-lg font-medium border-b border-DeepBlue/80 outline-none focus:border-DeepBlue"
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

      <div className="mt-2">
        <textarea
          ref={descriptionTextareaRef}
          placeholder={descriptionPlaceholder}
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value)}
          className={`w-full ${customHeight || (preferences?.hideHeader ? "h-[calc(100vh-246px)]" : "h-[calc(100vh-310px)]")} p-3 border border-gray-400 rounded-lg resize-none outline-none text-gray-700 leading-relaxed focus:border-DeepBlue`}
        />
      </div>
    </>
  );
}

export default TaskForm;
