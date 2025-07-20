"use client";

import CategorySelector from "@/components/features/category/category-selector";
import TrashIcon from "@/components/icons/trash-icon";
import PhotoButton from "@/components/ui/buttons/photo-button";
import SaveButton from "@/components/ui/buttons/save-button";
import DateInput from "@/components/ui/inputs/date-input";
import BoardIconSelector from "@/components/ui/selectors/board-icon-selector";
import CustomSelector from "@/components/ui/selectors/custom-selector";
import Tooltip from "@/components/ui/base/tooltip";
import { useBoards } from "@/src/hooks/use-boards";
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
  selectedBoardIds: string[];
  onBoardChange: (value: string | string[]) => void;
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
  boards?: any[]; // ボードデータをpropsとして受け取る
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
  selectedBoardIds,
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
  boards: boardsProp,
}: TaskFormProps) {
  // propsからボードデータが渡された場合はそれを使用、なければuseBoards
  const { data: boardsFromHook = [] } = useBoards();
  const boards = boardsProp || boardsFromHook;
  console.log('🔍 TaskForm ボードデータ状況:', {
    boardsProp: boardsProp?.length || 0,
    boardsFromHook: boardsFromHook.length,
    finalBoards: boards.length,
    hasBoardsProp: !!boardsProp
  });
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

    console.log('🔍 TaskForm ボードオプション生成:', {
      boards: boards.length,
      options: options.length,
      selectedBoardIds: selectedBoardIds.length,
      boardsList: boards.map(b => ({ id: b.id, name: b.name }))
    });

    return options;
  }, [boards, selectedBoardIds]);

  // 現在選択されているボードの値（複数選択対応）
  const currentBoardValue = selectedBoardIds;

  // ボード選択変更ハンドラー（複数選択対応）
  const handleBoardSelectorChange = (value: string | string[]) => {
    console.log('🔍 TaskForm ボード選択変更:', {
      value,
      type: Array.isArray(value) ? 'array' : 'string',
      currentSelectedBoardIds: selectedBoardIds
    });
    onBoardChange(value);
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
    <div className="flex flex-col flex-1">
      <div className="flex justify-start gap-2">
        <SaveButton
          onClick={onSave}
          disabled={!hasChanges || (!title.trim() && !isNewTask)}
          isSaving={isSaving}
          savedSuccessfully={savedSuccessfully}
          buttonSize="size-7"
          iconSize="size-4"
        />
        <Tooltip text="写真" position="top">
          <PhotoButton
            buttonSize="size-7"
            iconSize="size-5"
            className="rounded-full"
          />
        </Tooltip>
        <Tooltip text="ボード選択" position="top">
          <BoardIconSelector
            options={boardOptions}
            value={currentBoardValue}
            onChange={handleBoardSelectorChange}
            iconClassName="size-4 text-gray-600"
            multiple={true}
          />
        </Tooltip>
        {!isNewTask && onDelete && (
          <Tooltip text="削除" position="top">
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
            >
              <TrashIcon className="size-5" isLidOpen={isLidOpen} />
            </button>
          </Tooltip>
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

      <div className="mt-4 flex-1 flex flex-col">
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
}

export default TaskForm;
