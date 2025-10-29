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
import { TiptapEditor, Toolbar } from "../memo/tiptap-editor";
import type { Editor } from "@tiptap/react";
import CreatorAvatar from "@/components/shared/creator-avatar";
import DateInfo from "@/components/shared/date-info";

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
  createdBy?: string | null;
  createdByAvatarColor?: string | null;
  // 画像ペースト機能
  onPaste?: (e: React.ClipboardEvent<HTMLTextAreaElement>) => void;
  // Tiptapツールバー制御
  toolbarVisible?: boolean;
  onToolbarToggle?: (visible: boolean) => void;
  tiptapEditor?: Editor | null;
  onEditorReady?: (editor: Editor) => void;
  // ヘッダー部分のみ表示（タイトル・ステータス・日付）
  headerOnly?: boolean;
  // エディター部分のみ表示
  editorOnly?: boolean;
  // タイトル・日付のみ表示（固定ヘッダー用）
  titleAndDateOnly?: boolean;
  // ステータス欄のみ表示（スクロール領域用）
  statusOnly?: boolean;
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
    createdBy,
    createdByAvatarColor,
    onPaste,
    toolbarVisible = false,
    onToolbarToggle,
    tiptapEditor,
    onEditorReady,
    headerOnly = false,
    editorOnly = false,
    titleAndDateOnly = false,
    statusOnly = false,
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

  // タイトル・日付のみ表示（固定ヘッダー用）
  if (titleAndDateOnly) {
    return (
      <>
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
              }
            }}
            className="flex-1 mb-1 mt-1 text-[15px] md:text-lg font-medium border-b border-DeepBlue/80 outline-none focus:border-DeepBlue"
          />
        </div>

        {/* 作成者・日付を下の行に表示 */}
        {task && task.id !== 0 && (
          <div className="flex justify-end items-center gap-2 mr-2 mt-1 mb-1">
            <CreatorAvatar
              createdBy={createdBy}
              avatarColor={createdByAvatarColor}
              teamMode={_teamMode}
              size="md"
              className=""
            />
            <DateInfo item={task} isEditing={!isDeleted} size="sm" />
          </div>
        )}
      </>
    );
  }

  // ステータス欄のみ表示（スクロール領域用）
  if (statusOnly) {
    return (
      <div className="flex gap-2.5 pl-2">
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
    );
  }

  // ヘッダー部分のみ表示
  if (headerOnly) {
    return (
      <>
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
              }
            }}
            className="flex-1 mb-1 mt-1 text-[15px] md:text-lg font-medium border-b border-DeepBlue/80 outline-none focus:border-DeepBlue"
          />
        </div>

        {/* ステータス欄（常に表示） */}
        <div className="flex gap-2.5 mt-1">
          <CustomSelector
            label="ステータス"
            options={statusOptions}
            value={status}
            onChange={(value) =>
              onStatusChange(value as "todo" | "in_progress" | "completed")
            }
            fullWidth
            disabled={isDeleted}
            hideLabel={true}
            compactMode={true}
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
            hideLabel={true}
            compactMode={true}
          />

          <div className="flex-1 flex gap-2.5 items-center">
            <div className="w-32">
              <DateInput
                label="期限日"
                value={dueDate}
                onChange={onDueDateChange}
                fullWidth
                disabled={isDeleted}
                hideLabel={true}
                compactMode={true}
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

        {/* 作成者・日付を表示（ツールバー非表示時のみ） */}
        {task && task.id !== 0 && !toolbarVisible && (
          <div className="flex justify-end items-center gap-2 mr-2 mt-1 mb-1">
            <CreatorAvatar
              createdBy={createdBy}
              avatarColor={createdByAvatarColor}
              teamMode={_teamMode}
              size="md"
              className=""
            />
            <DateInfo item={task} isEditing={!isDeleted} size="sm" />
          </div>
        )}

        {/* 書式ツールバー（固定表示・日付の代わりに表示） */}
        {!isDeleted && toolbarVisible && (
          <Toolbar editor={tiptapEditor || null} />
        )}
      </>
    );
  }

  // エディター部分のみ表示
  if (editorOnly) {
    return (
      <div className="flex-1 flex flex-col min-h-0 pl-2">
        <div className="w-full pr-1">
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
            onEditorReady={onEditorReady}
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
    );
  }

  // 通常表示（全体）
  return (
    <div className="flex flex-col flex-1 min-h-0">
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

      {/* 作成者・日付を下の行に表示 */}
      {task && task.id !== 0 && (
        <div className="flex justify-end items-center gap-2 mr-2 mt-2 mb-1">
          <CreatorAvatar
            createdBy={createdBy}
            avatarColor={createdByAvatarColor}
            teamMode={_teamMode}
            size="md"
            className=""
          />
          <DateInfo item={task} isEditing={!isDeleted} size="sm" />
        </div>
      )}

      <div className="flex-1 flex flex-col min-h-0">
        <div className="w-full pr-1">
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
            onEditorReady={onEditorReady}
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
