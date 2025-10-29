"use client";

import CategorySelector from "@/components/features/category/category-selector";
import DateInput from "@/components/ui/inputs/date-input";
import CustomSelector from "@/components/ui/selectors/custom-selector";
import BoardTagDisplay from "@/components/shared/board-tag-display";
import BoardCategorySelector from "@/components/features/board-categories/board-category-selector";
import type { Task } from "@/src/types/task";
import type { Tag } from "@/src/types/tag";
import type { Board } from "@/src/types/board";
import type { BoardCategory } from "@/src/types/board-categories";
import {
  getPriorityEditorColor,
  getPriorityText,
  getStatusEditorColor,
  getStatusText,
} from "@/src/utils/taskUtils";
import {
  useEffect,
  useRef,
  forwardRef,
  useImperativeHandle,
  useMemo,
  useState,
} from "react";
import UrlPreview from "@/src/components/shared/url-preview";
import { TiptapEditor } from "../memo/tiptap-editor";

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
  boardCategoryId: number | null;
  onBoardCategoryChange: (value: number | null) => void;
  dueDate: string;
  onDueDateChange: (value: string) => void;
  isNewTask?: boolean;
  titlePlaceholder?: string;
  descriptionPlaceholder?: string;
  customHeight?: string;
  tags?: Tag[];
  boards?: Board[];
  boardCategories?: BoardCategory[];
  isDeleted?: boolean;
  initialBoardId?: number;
  showBoardCategory?: boolean; // ボード詳細でのみtrue
  // チーム機能
  teamMode?: boolean;
  // 画像ペースト機能
  onPaste?: (e: React.ClipboardEvent<HTMLTextAreaElement>) => void;
  // Tiptapツールバー制御
  toolbarVisible?: boolean;
  onToolbarToggle?: (visible: boolean) => void;
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
    boardCategoryId,
    onBoardCategoryChange,
    dueDate,
    onDueDateChange,
    isNewTask = false,
    titlePlaceholder = "タスクタイトルを入力...",
    descriptionPlaceholder = "入力...",
    customHeight,
    tags = [],
    boards = [],
    boardCategories = [],
    isDeleted = false,
    initialBoardId,
    showBoardCategory = false,
    teamMode: _teamMode = false,
    onPaste,
    toolbarVisible = false,
    onToolbarToggle,
  } = props;
  const titleInputRef = useRef<HTMLInputElement>(null);
  const descriptionTextareaRef = useRef<HTMLTextAreaElement>(null);

  // 表示用のボード（initialBoardIdは除外）
  const displayBoards = useMemo(() => {
    return boards.filter(
      (board) => !initialBoardId || board.id !== initialBoardId,
    );
  }, [boards, initialBoardId]);

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
  useImperativeHandle(
    ref,
    () => ({
      focusTitle: () => {
        titleInputRef.current?.focus();
      },
    }),
    [],
  );

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
      <div className="flex items-center gap-1">
        <input
          ref={titleInputRef}
          type="text"
          placeholder={titlePlaceholder}
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              // エンターキーでの本文移動機能を無効化
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
          disabled={isDeleted}
        />

        <CustomSelector
          label="優先度"
          options={priorityOptions}
          value={priority}
          onChange={(value) =>
            onPriorityChange(value as "low" | "medium" | "high")
          }
          fullWidth
          disabled={isDeleted}
        />

        <div className="flex-1 flex gap-2.5 items-center">
          <div className="w-32">
            <DateInput
              label="期限日"
              value={dueDate}
              onChange={onDueDateChange}
              fullWidth
              disabled={isDeleted}
            />
          </div>

          {showBoardCategory && (
            <div className="w-80">
              <BoardCategorySelector
                value={boardCategoryId}
                onChange={onBoardCategoryChange}
                categories={boardCategories}
                boardId={initialBoardId!}
                disabled={isDeleted}
                allowCreate={true}
              />
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 flex flex-col mt-2">
        <div className={`w-full ${customHeight || "flex-1 min-h-0"} pr-1 mt-2`}>
          <TiptapEditor
            content={description}
            onChange={(newContent) => {
              onDescriptionChange(newContent);
            }}
            placeholder={
              isDeleted ? "削除済みのタスクです" : descriptionPlaceholder
            }
            readOnly={isDeleted}
            className="font-medium"
            toolbarVisible={toolbarVisible}
            onToolbarToggle={onToolbarToggle}
          />
        </div>

        {/* URL自動リンク化プレビュー（URLを含む行のみ表示） */}
        {description && !isDeleted && (
          <UrlPreview text={description} className="mt-2 mb-2 px-1" />
        )}

        {/* ボード名・タグ表示（テキストエリアの下に移動） */}
        <BoardTagDisplay
          boards={displayBoards}
          tags={tags}
          spacing="normal"
          showWhen="has-content"
          className="mb-4"
        />
      </div>
    </div>
  );
});

TaskForm.displayName = "TaskForm";

export default TaskForm;
