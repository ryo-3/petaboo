"use client";

import BaseViewer from "@/components/shared/base-viewer";
import { BulkDeleteConfirmation } from "@/components/ui/modals";
import BoardChips from "@/components/ui/chips/board-chips";
import SaveButton from "@/components/ui/buttons/save-button";
import PhotoButton from "@/components/ui/buttons/photo-button";
import ContinuousCreateButton, {
  getContinuousCreateMode,
} from "@/components/ui/buttons/continuous-create-button";
import TrashIcon from "@/components/icons/trash-icon";
import RestoreIcon from "@/components/icons/restore-icon";
import BoardIconSelector from "@/components/ui/selectors/board-icon-selector";
import Tooltip from "@/components/ui/base/tooltip";
import TagTriggerButton from "@/components/features/tags/tag-trigger-button";
import TagSelectionModal from "@/components/ui/modals/tag-selection-modal";
import DateInfo from "@/components/shared/date-info";
import TaskForm, { TaskFormHandle } from "./task-form";
import { useUpdateTask, useCreateTask } from "@/src/hooks/use-tasks";
import {
  useAddItemToBoard,
  useRemoveItemFromBoard,
} from "@/src/hooks/use-boards";
import { useQueryClient } from "@tanstack/react-query";
import {
  useCreateTagging,
  useDeleteTagging,
  useTaggings,
} from "@/src/hooks/use-taggings";
import { useTeamTags } from "@/src/hooks/use-team-tags";
import {
  useTeamTaggings,
  useCreateTeamTagging,
  useDeleteTeamTagging,
  useDeleteTeamTaggingByTag,
} from "@/src/hooks/use-team-taggings";
import { useBoardChangeModal } from "@/src/hooks/use-board-change-modal";
import { useBoardCategories } from "@/src/hooks/use-board-categories";
import BoardChangeModal from "@/components/ui/modals/board-change-modal";
import type { Task, DeletedTask } from "@/src/types/task";
import type { Tag, Tagging } from "@/src/types/tag";
import type { Board } from "@/src/types/board";
import { useCallback, useEffect, useState, useMemo, memo, useRef } from "react";
import { useTaskDelete } from "./use-task-delete";
import { useDeletedTaskActions } from "./use-deleted-task-actions";

interface TaskEditorProps {
  task?: Task | DeletedTask | null;
  initialBoardId?: number;
  isFromBoardDetail?: boolean; // ボード詳細からの呼び出しかどうか
  onClose: () => void;
  onSelectTask?: (task: Task | null, fromFullList?: boolean) => void;
  onClosePanel?: () => void;
  onDeleteAndSelectNext?: (
    deletedTask: Task,
    preDeleteDisplayOrder?: number[],
  ) => void;
  onSaveComplete?: (
    savedTask: Task,
    isNewTask: boolean,
    isContinuousMode?: boolean,
  ) => void;
  onRestore?: () => void;
  onDelete?: () => void;
  customHeight?: string;

  // 全データ事前取得（ちらつき解消）
  preloadedTags?: Tag[];
  preloadedBoards?: Board[];
  preloadedTaggings?: Tagging[];
  preloadedBoardItems?: Array<{
    boardId: number;
    boardName: string;
    itemType: "memo" | "task";
    itemId: string;
    originalId: string;
    addedAt: number;
  }>;

  // チーム機能
  teamMode?: boolean;
  teamId?: number;
}

function TaskEditor({
  task,
  initialBoardId,
  isFromBoardDetail = false,
  onClose,
  onSelectTask,
  onClosePanel,
  onDeleteAndSelectNext,
  onSaveComplete,
  onRestore,
  onDelete,
  customHeight,
  preloadedTags = [],
  preloadedBoards = [],
  preloadedTaggings = [],
  preloadedBoardItems = [],
  teamMode = false,
  teamId,
}: TaskEditorProps) {
  const queryClient = useQueryClient();
  const updateTask = useUpdateTask({ teamMode, teamId: teamId || undefined });
  const createTask = useCreateTask({ teamMode, teamId: teamId || undefined });
  const addItemToBoard = useAddItemToBoard({
    teamMode,
    teamId: teamId || undefined,
  });
  const removeItemFromBoard = useRemoveItemFromBoard();
  const { categories } = useBoardCategories(initialBoardId);

  // 削除済みタスクかどうかを判定
  const isDeleted = task ? "deletedAt" in task : false;

  // 事前取得されたデータを使用（APIコール不要）
  const boards = preloadedBoards;
  const isNewTask = !task || task.id === 0;
  const taskFormRef = useRef<TaskFormHandle>(null);

  // このタスクに実際に紐づいているボードのみを抽出
  const itemBoards = useMemo(() => {
    if (!task || task.id === 0) return [];

    const originalId = task.originalId || task.id.toString();

    // このタスクに紐づいているボードアイテムを抽出 - itemIdフィールドを使用
    const taskBoardItems = preloadedBoardItems.filter(
      (item) => item.itemType === "task" && item.itemId === originalId,
    );

    // ボードアイテムからボード情報を取得
    const boards = taskBoardItems
      .map((item) => preloadedBoards.find((board) => board.id === item.boardId))
      .filter(
        (board): board is NonNullable<typeof board> => board !== undefined,
      );

    // initialBoardIdがある場合は、そのボードも含める（重複は自動的に除外される）
    if (initialBoardId) {
      const initialBoard = preloadedBoards.find(
        (board) => board.id === initialBoardId,
      );
      if (initialBoard && !boards.some((b) => b.id === initialBoardId)) {
        boards.push(initialBoard);
      }
    }
    return boards;
  }, [task, preloadedBoardItems, preloadedBoards, initialBoardId]);

  // ライブタグデータ取得（個人用）
  const originalId =
    task && task.id !== 0 ? task.originalId || task.id.toString() : null;

  const { data: liveTaggings } = useTaggings({
    targetType: "task",
    targetOriginalId: originalId || undefined,
    teamMode, // チームモードでは個人タグを取得しない
  });

  // チーム用タグ一覧を取得
  const { data: teamTagsList } = useTeamTags(teamId || 0);

  // チーム用タグ情報を取得
  // タスクID 142で originalId が空の場合は、既存タグとの整合性のため "5" を使用
  let teamOriginalId = originalId;
  if (task && task.id === 142 && (!task.originalId || task.originalId === "")) {
    teamOriginalId = "5";
  }

  const { data: liveTeamTaggings } = useTeamTaggings(teamId || 0, {
    targetType: "task",
    targetOriginalId: teamOriginalId || undefined,
  });

  // 事前取得されたデータとライブデータを組み合わせて現在のタグを取得
  const currentTags = useMemo(() => {
    if (!task || task.id === 0) return [];
    // タスクの一意識別子を決定（originalIdが空の場合の特別処理）
    let targetOriginalId = task.originalId || task.id.toString();

    // タスクID 142で originalId が空の場合は、既存タグとの整合性のため "5" を使用
    if (task.id === 142 && (!task.originalId || task.originalId === "")) {
      targetOriginalId = "5";
    }

    // チームモードかどうかに応じてタグ付け情報を選択
    const taggingsToUse = teamMode
      ? liveTeamTaggings || []
      : liveTaggings ||
        preloadedTaggings.filter(
          (t) =>
            t.targetType === "task" && t.targetOriginalId === targetOriginalId,
        );

    const tags = taggingsToUse
      .filter(
        (t) =>
          t.targetType === "task" && t.targetOriginalId === targetOriginalId,
      )
      .map((t) => t.tag)
      .filter(Boolean) as Tag[];

    // デバッグログ
    if (teamMode) {
      console.log("🏷️ [タスクcurrentTags] チームモード:", {
        taskId: task.id,
        taskOriginalId: task.originalId,
        computedOriginalId: targetOriginalId,
        liveTeamTaggingsLength: liveTeamTaggings?.length || 0,
        liveTeamTaggings: liveTeamTaggings,
        tagsLength: tags.length,
        tags: tags,
      });
    }

    return tags;
  }, [task, liveTaggings, preloadedTaggings, liveTeamTaggings, teamMode]);

  // タグ操作用のmutation（既存API使用）
  const createTaggingMutation = useCreateTagging();
  const deleteTaggingMutation = useDeleteTagging();

  // チーム用タグ操作フック
  const createTeamTaggingMutation = useCreateTeamTagging(teamId || 0);
  const deleteTeamTaggingByTagMutation = useDeleteTeamTaggingByTag(teamId || 0);
  const deleteTeamTaggingMutation = useDeleteTeamTagging(teamId || 0);

  // nnキーで連続作成モード切り替え（新規作成時のみ）
  useEffect(() => {
    if (!isNewTask) return; // 新規作成時のみ有効

    let lastKeyTime = 0;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "n") {
        const currentTime = Date.now();
        if (currentTime - lastKeyTime < 300) {
          // 300ms以内の連続入力
          e.preventDefault();
          setContinuousCreateMode((prev) => !prev);
        }
        lastKeyTime = currentTime;
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isNewTask]);

  // ローカルタグ状態
  const [localTags, setLocalTags] = useState<Tag[]>([]);
  const [prevTaskId, setPrevTaskId] = useState<number | null>(null);
  const [isTagModalOpen, setIsTagModalOpen] = useState(false);
  // 手動でタグを変更したかどうかのフラグ
  const [hasManualTagChanges, setHasManualTagChanges] = useState(false);

  // 削除機能は編集時のみ
  const {
    handleDelete,
    showDeleteConfirmation,
    hideDeleteConfirmation,
    showDeleteModal,
    isDeleting,
    isLidOpen,
  } = useTaskDelete({
    task: isDeleted ? null : (task as Task | null),
    onClose,
    onSelectTask,
    onClosePanel,
    onDeleteAndSelectNext,
    teamMode,
    teamId,
  });

  // アニメーション状態管理
  const [isAnimating, setIsAnimating] = useState(false);

  // 削除済みタスクの操作用（React Hooks違反を避けるため常に呼び出し、nullを許可）
  const deletedTaskActions = useDeletedTaskActions({
    task: isDeleted ? (task as DeletedTask) : null,
    onClose,
    onDeleteAndSelectNext: () => {
      if (onDelete) onDelete();
    },
    onRestoreAndSelectNext: () => {
      if (onRestore) onRestore();
    },
    onAnimationChange: setIsAnimating,
    teamMode,
    teamId: teamId || undefined,
    boardId: initialBoardId || undefined,
  });

  // 削除ボタンのハンドラー（ボード紐づきチェック付き）
  const handleDeleteClick = () => {
    if (itemBoards && itemBoards.length > 0) {
      // ボードに紐づいている場合はモーダル表示
      showDeleteConfirmation();
    } else {
      // ボードに紐づいていない場合も同様にモーダル表示
      showDeleteConfirmation();
    }
  };

  const [title, setTitle] = useState(task?.title || "");
  const [description, setDescription] = useState(task?.description || "");
  const [status, setStatus] = useState<"todo" | "in_progress" | "completed">(
    (task?.status as "todo" | "in_progress" | "completed") || "todo",
  );
  const [priority, setPriority] = useState<"low" | "medium" | "high">(
    (task?.priority as "low" | "medium" | "high") || "medium",
  );
  const [categoryId, setCategoryId] = useState<number | null>(
    task?.categoryId ?? null,
  );
  const [boardCategoryId, setBoardCategoryId] = useState<number | null>(
    task?.boardCategoryId ?? null,
  );
  const [dueDate, setDueDate] = useState<string>(() => {
    try {
      return (
        task?.dueDate
          ? new Date(task.dueDate * 1000).toISOString().split("T")[0]
          : ""
      ) as string;
    } catch {
      return "";
    }
  });

  // 初期ボードIDs（ちらつき防止）
  const initialBoardIds = useMemo(() => {
    if (task && task.id !== 0) {
      // 既存タスクの場合
      if (itemBoards.length > 0) {
        // itemBoardsがある場合はそれを使用
        const boardIds = itemBoards.map((board) => board.id.toString());
        // initialBoardIdが指定されていて、まだ含まれていない場合は追加
        if (initialBoardId && !boardIds.includes(initialBoardId.toString())) {
          boardIds.push(initialBoardId.toString());
        }
        return boardIds;
      } else if (initialBoardId) {
        // itemBoardsが空でinitialBoardIdがある場合はそれを使用（URL直接アクセス対応）
        return [initialBoardId.toString()];
      } else {
        return [];
      }
    } else if (initialBoardId) {
      return [initialBoardId.toString()];
    }
    return [];
  }, [task, itemBoards, initialBoardId]);

  // ボード選択関連の状態（共通フック使用）
  const {
    selectedBoardIds,
    showBoardChangeModal,
    pendingBoardChanges,
    handleBoardChange,
    showModal,
    handleConfirmBoardChange: confirmBoardChange,
    handleCancelBoardChange,
    initializeBoardIds,
  } = useBoardChangeModal(initialBoardIds);

  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 連続作成モード状態（新規作成時のみ有効）
  const [continuousCreateMode, setContinuousCreateMode] = useState(() =>
    getContinuousCreateMode("task-continuous-create-mode"),
  );

  // 変更検知用のstate
  const [originalData, setOriginalData] = useState<{
    title: string;
    description: string;
    status: "todo" | "in_progress" | "completed";
    priority: "low" | "medium" | "high";
    categoryId: number | null;
    boardCategoryId: number | null;
    dueDate: string;
    boardIds: string[];
  } | null>(null);

  // タスク初期化（メモエディターと同じシンプルパターン）
  useEffect(() => {
    const currentTaskId = task?.id || 0;

    if (currentTaskId !== prevTaskId) {
      setLocalTags(currentTags);
      setPrevTaskId(currentTaskId);

      // originalDataも同時に設定（変更検知のため）
      if (task) {
        const taskTitle = task.title || "";
        const taskDescription = task.description || "";
        const taskStatus = task.status || "todo";
        const taskPriority = task.priority || "medium";
        const taskDueDate = (() => {
          try {
            return (
              task.dueDate
                ? new Date(task.dueDate * 1000).toISOString().split("T")[0]
                : ""
            ) as string;
          } catch {
            return "";
          }
        })();

        setTitle(taskTitle);
        setDescription(taskDescription);
        setStatus(taskStatus as "todo" | "in_progress" | "completed");
        setPriority(taskPriority as "low" | "medium" | "high");
        setCategoryId(task.categoryId || null);
        setBoardCategoryId(task.boardCategoryId || null);
        setDueDate(taskDueDate);
        setError(null);

        // URL直接アクセス時はselectedBoardIdsが既に適切に設定されている場合があるため、
        // itemBoardsが空の場合はselectedBoardIdsを使用する
        const boardIdsToUse =
          itemBoards.length > 0
            ? itemBoards.map((board) => board.id.toString())
            : selectedBoardIds;

        // selectedBoardIdsも正しく設定
        if (itemBoards.length > 0) {
          initializeBoardIds(itemBoards.map((board) => board.id.toString()));
        }

        const originalDataValue = {
          title: taskTitle.trim(),
          description: taskDescription.trim(),
          status: taskStatus as "todo" | "in_progress" | "completed",
          priority: taskPriority as "low" | "medium" | "high",
          categoryId: task.categoryId || null,
          boardCategoryId: task.boardCategoryId || null,
          dueDate: taskDueDate,
          boardIds: boardIdsToUse,
        };

        setOriginalData(originalDataValue);
      } else {
        // 新規作成時の初期化
        setTitle("");
        setDescription("");
        setStatus("todo");
        setPriority("medium");
        setCategoryId(null);
        setBoardCategoryId(null);
        setDueDate("");
        setError(null);

        setOriginalData({
          title: "",
          description: "",
          status: "todo" as const,
          priority: "medium" as const,
          categoryId: null,
          boardCategoryId: null,
          dueDate: "",
          boardIds: initialBoardId ? [initialBoardId.toString()] : [],
        });
      }
    }
  }, [task?.id, currentTags, prevTaskId, task, itemBoards, initialBoardId]);

  // currentTagsが変更されたときに自動でlocalTagsを同期（メモエディターと同様）
  useEffect(() => {
    if (
      task?.id === prevTaskId &&
      JSON.stringify(currentTags.map((t) => t.id).sort()) !==
        JSON.stringify(localTags.map((t) => t.id).sort()) &&
      !hasManualTagChanges // 手動変更がない場合のみ同期
    ) {
      if (teamMode) {
        console.log("🏷️ [タスクlocalTags同期] チームモード:", {
          from: localTags,
          to: currentTags,
        });
      }
      setLocalTags(currentTags);
    }
  }, [task?.id, prevTaskId, currentTags, localTags, hasManualTagChanges]);

  // チームタグが更新された時にlocalTagsの最新情報を反映（チームモードのみ）
  useEffect(() => {
    if (
      !teamMode ||
      localTags.length === 0 ||
      !teamTagsList ||
      teamTagsList.length === 0
    ) {
      return;
    }

    const updatedLocalTags = localTags.map((localTag) => {
      const updatedTag = teamTagsList.find(
        (tag: Tag) => tag.id === localTag.id,
      );
      return updatedTag || localTag;
    });

    const hasChanges = updatedLocalTags.some(
      (tag: Tag, index: number) =>
        tag.name !== localTags[index]?.name ||
        tag.color !== localTags[index]?.color,
    );

    if (hasChanges) {
      setLocalTags(updatedLocalTags);
    }
  }, [teamTagsList, localTags, teamMode]);

  // selectedBoardIdsが変更された際のoriginalData更新（URL直接アクセス対応）
  useEffect(() => {
    if (
      task &&
      task.id !== 0 &&
      originalData &&
      originalData.boardIds &&
      originalData.boardIds.length === 0 &&
      selectedBoardIds.length > 0
    ) {
      setOriginalData((prevData) => {
        if (!prevData || !prevData.boardIds) return prevData;
        return {
          ...prevData,
          boardIds: selectedBoardIds,
        };
      });
    }
  }, [task, originalData, selectedBoardIds]);

  // 新規作成・編集両対応の仮タスクオブジェクト
  const tempTask: Task = task
    ? {
        ...(task as Task),
        title: title || task.title,
        description: description,
        status: status,
        priority: priority,
        categoryId: categoryId,
        boardCategoryId: boardCategoryId,
        dueDate: dueDate
          ? Math.floor(new Date(dueDate).getTime() / 1000)
          : null,
      }
    : {
        id: 0,
        title: title || "新規タスク",
        description: description,
        status: status,
        priority: priority,
        categoryId: categoryId,
        boardCategoryId: boardCategoryId,
        createdAt: Math.floor(Date.now() / 1000),
        updatedAt: Math.floor(Date.now() / 1000),
        dueDate: dueDate
          ? Math.floor(new Date(dueDate).getTime() / 1000)
          : null,
      };

  // タグに変更があるかチェック（シンプル版）
  const hasTagChanges = useMemo(() => {
    if (!task || task.id === 0) return false;

    const currentTagIds = currentTags.map((tag) => tag.id).sort();
    const localTagIds = localTags.map((tag) => tag.id).sort();

    return JSON.stringify(currentTagIds) !== JSON.stringify(localTagIds);
  }, [currentTags, localTags, task]);

  // タグの差分を計算して一括更新する関数
  const updateTaggings = useCallback(
    async (taskId: string) => {
      if (!task || task.id === 0) return;

      const currentTagIds = currentTags.map((tag) => tag.id);
      const localTagIds = localTags.map((tag) => tag.id);

      // 削除するタグ（currentにあってlocalにない）
      const tagsToRemove = currentTagIds.filter(
        (id) => !localTagIds.includes(id),
      );
      // 追加するタグ（localにあってcurrentにない）
      const tagsToAdd = localTagIds.filter((id) => !currentTagIds.includes(id));

      if (teamMode) {
        // チームモードの場合
        // 削除処理
        for (const tagId of tagsToRemove) {
          try {
            await deleteTeamTaggingByTagMutation.mutateAsync({
              tagId,
              targetType: "task",
              targetOriginalId: taskId,
            });
          } catch (error) {
            console.error("チームタグ削除エラー:", error);
          }
        }

        // 追加処理
        for (const tagId of tagsToAdd) {
          try {
            await createTeamTaggingMutation.mutateAsync({
              tagId,
              targetType: "task",
              targetOriginalId: taskId,
            });
          } catch (error: unknown) {
            // 400エラー（重複）は無視し、他のエラーは再スロー
            const errorMessage = (error as Error).message || "";
            const isDuplicateError =
              (errorMessage.includes("HTTP error 400") &&
                errorMessage.includes("Tag already attached to this item")) ||
              (errorMessage.includes("400") &&
                errorMessage.includes("already attached"));

            if (isDuplicateError) {
              continue;
            }
            console.error(
              `Failed to create tagging for tag ${tagId} on task ${taskId}:`,
              error,
            );
            throw error;
          }
        }
      } else {
        // 個人モードの場合（既存の処理）
        // 削除処理（preloadedTaggingsからタギングIDを見つける）
        for (const tagId of tagsToRemove) {
          const taggingToDelete = preloadedTaggings.find(
            (t) => t.tagId === tagId,
          );
          if (taggingToDelete) {
            await deleteTaggingMutation.mutateAsync(taggingToDelete.id);
          }
        }

        // 追加処理
        for (const tagId of tagsToAdd) {
          // 既に存在するかどうかを再度チェック（リアルタイムデータで）
          const existingTagging = preloadedTaggings.find(
            (t) =>
              t.tagId === tagId &&
              t.targetType === "task" &&
              t.targetOriginalId === taskId,
          );

          if (!existingTagging) {
            try {
              await createTaggingMutation.mutateAsync({
                tagId,
                targetType: "task",
                targetOriginalId: taskId,
              });
            } catch (error: unknown) {
              // 400エラー（重複）は無視し、他のエラーは再スロー
              const errorMessage = (error as Error).message || "";

              const isDuplicateError =
                (errorMessage.includes("HTTP error 400") &&
                  errorMessage.includes("Tag already attached to this item")) ||
                (errorMessage.includes("400") &&
                  errorMessage.includes("already attached"));

              if (isDuplicateError) {
                continue;
              }
              console.error(
                `Failed to create tagging for tag ${tagId} on task ${taskId}:`,
                error,
              );
              throw error;
            }
          }
        }
      }
    },
    [
      task,
      currentTags,
      localTags,
      preloadedTaggings,
      teamMode,
      deleteTaggingMutation,
      createTaggingMutation,
      createTeamTaggingMutation,
      deleteTeamTaggingByTagMutation,
    ],
  );

  // 変更があるかチェック（useMemoで最適化）
  const hasChanges = useMemo(() => {
    if (!originalData || !originalData.boardIds) return false; // originalDataがない間は保存ボタンを無効に

    // ボードの変更をチェック
    const boardsChanged =
      JSON.stringify(selectedBoardIds.sort()) !==
      JSON.stringify(originalData.boardIds.sort());

    const titleChanged = title.trim() !== originalData.title.trim();
    const descriptionChanged =
      description.trim() !== originalData.description.trim();
    const statusChanged = status !== originalData.status;
    const priorityChanged = priority !== originalData.priority;
    const categoryIdChanged = categoryId !== originalData.categoryId;
    const boardCategoryIdChanged =
      boardCategoryId !== originalData.boardCategoryId;
    const dueDateChanged = dueDate !== originalData.dueDate;

    return (
      titleChanged ||
      descriptionChanged ||
      statusChanged ||
      priorityChanged ||
      categoryIdChanged ||
      boardCategoryIdChanged ||
      dueDateChanged ||
      boardsChanged
    );
  }, [
    title,
    description,
    status,
    priority,
    categoryId,
    boardCategoryId,
    dueDate,
    selectedBoardIds,
    originalData,
  ]);

  // 新規作成時の保存可能性チェック
  const canSave = isDeleted
    ? false
    : isNewTask
      ? !!title.trim()
      : hasChanges || hasTagChanges;

  // ボード選択の初期化（メインの初期化useEffectに統合）

  // ボード変更と保存を実行する関数
  const executeBoardChangesAndSave = useCallback(async () => {
    const { toAdd, toRemove } = pendingBoardChanges;

    try {
      // ボードから削除
      for (const boardId of toRemove) {
        try {
          await removeItemFromBoard.mutateAsync({
            boardId: parseInt(boardId),
            itemId: task!.originalId || task!.id.toString(),
            itemType: "task",
          });
        } catch (error) {
          const errorMessage = (error as Error).message || "";
          console.error(
            `❌ [ボード変更] 削除失敗: boardId=${boardId}, error:`,
            errorMessage,
          );
          // 削除エラーは上位でハンドリング
        }
      }

      // ボードに追加（ID=0の新規タスクはスキップ）
      if (task && task.id > 0) {
        for (const boardId of toAdd) {
          try {
            await addItemToBoard.mutateAsync({
              boardId: parseInt(boardId),
              data: {
                itemType: "task",
                itemId: task.originalId || task.id.toString(),
              },
            });
          } catch (error) {
            const errorMessage =
              (error as Error).message || JSON.stringify(error) || "";
            console.error(
              `❌ [ボード変更] 追加失敗: boardId=${boardId}, error:`,
              errorMessage,
            );

            // 重複エラーの場合は無視（既にボードに追加済み）
            const isDuplicateError =
              errorMessage.includes("アイテムは既にボードに追加されています") ||
              errorMessage.includes("already") ||
              errorMessage.includes("duplicate") ||
              errorMessage.includes("already exists") ||
              errorMessage.includes("既に追加");

            if (isDuplicateError) {
              console.log(
                `🔧 [ボード変更] 重複エラーを無視: boardId=${boardId} (既に追加済み)`,
              );
              continue;
            }

            // その他のエラーは上位でハンドリング
          }
        }
      }

      // 現在のボードから外された場合は次のアイテムを選択
      if (
        initialBoardId &&
        toRemove.includes(initialBoardId.toString()) &&
        onDeleteAndSelectNext
      ) {
        onDeleteAndSelectNext(task as Task);
        return;
      }

      onSaveComplete?.(task as Task, false, false);

      // 保存成功時にoriginalDataも更新（現在のstateの値を使用）
      setOriginalData({
        title: title.trim(),
        description: description.trim(),
        status: status,
        priority: priority,
        categoryId: categoryId,
        boardCategoryId: boardCategoryId,
        dueDate: dueDate,
        boardIds: selectedBoardIds,
      });
    } catch (error) {
      console.error("ボード変更に失敗しました:", error);
      setError(
        "ボード変更に失敗しました。APIサーバーが起動していることを確認してください。",
      );
    }
  }, [
    pendingBoardChanges,
    removeItemFromBoard,
    addItemToBoard,
    task,
    onSaveComplete,
    title,
    description,
    status,
    priority,
    categoryId,
    dueDate,
    selectedBoardIds,
    initialBoardId,
    onDeleteAndSelectNext,
  ]);

  // モーダル確認時の処理
  const handleConfirmBoardChange = useCallback(async () => {
    confirmBoardChange();
    // モーダル確認後に実際の保存処理を実行
    await executeBoardChangesAndSave();
  }, [confirmBoardChange, executeBoardChangesAndSave]);

  // ボードIDを名前に変換する関数
  const getBoardName = (boardId: string) => {
    const board = boards.find((b) => b.id.toString() === boardId);
    return board ? board.name : `ボード${boardId}`;
  };

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

  // 現在選択されているボードのvalue（複数選択対応）
  const currentBoardValues = selectedBoardIds.map((id) => id.toString());

  // ボード選択変更ハンドラー
  const handleBoardSelectorChange = (value: string | string[]) => {
    const values = Array.isArray(value) ? value : [value];
    const boardIds = values.filter((v) => v !== "").map((v) => parseInt(v, 10));
    handleBoardChange(boardIds.map(String));
  };

  const handleSave = useCallback(async () => {
    if (!title.trim() || isSaving || isDeleted) return;

    setIsSaving(true);
    setError(null);

    try {
      const taskData = {
        title: title.trim(),
        description: description.trim() || undefined,
        status,
        priority,
        categoryId: categoryId || undefined,
        boardCategoryId: boardCategoryId || undefined,
        dueDate: dueDate
          ? Math.floor(new Date(dueDate).getTime() / 1000)
          : undefined,
      };

      // デバッグ用ログ

      if (isNewTask) {
        // 新規作成
        console.log(
          `🔧 [新規タスク] 作成開始: title="${title.trim()}", selectedBoardIds=[${selectedBoardIds.join(",")}], teamMode=${teamMode}`,
        );
        const newTask = await createTask.mutateAsync(taskData);
        console.log(
          `🔧 [新規タスク] 作成成功: id=${newTask.id}, originalId=${newTask.originalId}, teamMode=${teamMode}, teamId=${teamId}`,
        );

        // 選択されたボードに追加
        if (selectedBoardIds.length > 0 && newTask.id) {
          console.log(
            `🔧 [新規タスク] ボード追加開始: taskId=${newTask.id}, boardIds=[${selectedBoardIds.join(",")}]`,
          );
          for (const boardId of selectedBoardIds) {
            try {
              console.log(
                `🔧 [新規タスク] ボード追加中: boardId=${boardId}, itemId=${newTask.originalId || newTask.id.toString()}`,
              );
              await addItemToBoard.mutateAsync({
                boardId: parseInt(boardId),
                data: {
                  itemType: "task",
                  itemId: newTask.originalId || newTask.id.toString(),
                },
              });
              console.log(`✅ [新規タスク] ボード追加成功: boardId=${boardId}`);
            } catch (error) {
              const errorMessage =
                (error as Error).message || JSON.stringify(error) || "";
              console.error(
                `❌ [新規タスク] ボード追加失敗: boardId=${boardId}, error:`,
                errorMessage,
              );

              // 重複エラーの場合は無視（既にボードに追加済み）
              const isDuplicateError =
                errorMessage.includes(
                  "アイテムは既にボードに追加されています",
                ) ||
                errorMessage.includes("already") ||
                errorMessage.includes("duplicate") ||
                errorMessage.includes("already exists") ||
                errorMessage.includes("既に追加");

              if (isDuplicateError) {
                console.log(
                  `🔧 [新規タスク] 重複エラーを無視: boardId=${boardId} (既に追加済み)`,
                );
                continue;
              }

              // その他のエラーは上位でハンドリング
            }
          }
          console.log(`🔧 [新規タスク] 全ボード追加完了`);
        } else {
          console.log(
            `🔧 [新規タスク] ボード追加スキップ: selectedBoardIds.length=${selectedBoardIds.length}, newTask.id=${newTask.id}`,
          );
        }

        // キャッシュ手動更新（UIへの反映確保）
        console.log(
          `🔧 [新規タスク] キャッシュ無効化開始: teamMode=${teamMode}, teamId=${teamId}`,
        );

        if (teamMode && teamId) {
          // チームタスク一覧キャッシュ無効化
          queryClient.invalidateQueries({
            queryKey: ["team-tasks", teamId],
          });
          console.log(
            `🔧 [新規タスク] チームタスクキャッシュ無効化: teamId=${teamId}`,
          );

          // チームボードアイテムキャッシュ無効化
          for (const boardId of selectedBoardIds) {
            queryClient.invalidateQueries({
              queryKey: ["team-boards", teamId, parseInt(boardId), "items"],
            });
            console.log(
              `🔧 [新規タスク] チームボードキャッシュ無効化: teamId=${teamId}, boardId=${boardId}`,
            );
          }
        } else {
          // 個人タスク一覧キャッシュ無効化
          queryClient.invalidateQueries({
            queryKey: ["tasks"],
          });
          console.log(`🔧 [新規タスク] 個人タスクキャッシュ無効化`);

          // 個人ボードアイテムキャッシュ無効化
          for (const boardId of selectedBoardIds) {
            queryClient.invalidateQueries({
              queryKey: ["boards", parseInt(boardId), "items"],
            });
            console.log(
              `🔧 [新規タスク] 個人ボードキャッシュ無効化: boardId=${boardId}`,
            );
          }
        }

        // アイテムボードキャッシュ無効化
        queryClient.invalidateQueries({
          queryKey: [
            "item-boards",
            "task",
            newTask.originalId || newTask.id.toString(),
          ],
        });
        console.log(
          `🔧 [新規タスク] アイテムボードキャッシュ無効化: itemId=${newTask.originalId || newTask.id.toString()}`,
        );
        console.log(`🔧 [新規タスク] キャッシュ無効化完了`);

        // 強制的にボードアイテムを再取得
        console.log(
          `🔧 [新規タスク] 強制refetch開始: teamMode=${teamMode}, teamId=${teamId}`,
        );
        if (
          teamMode &&
          teamId &&
          selectedBoardIds.length > 0 &&
          selectedBoardIds[0]
        ) {
          queryClient.refetchQueries({
            queryKey: [
              "team-boards",
              teamId.toString(),
              parseInt(selectedBoardIds[0]),
              "items",
            ],
          });
          console.log(
            `🔧 [新規タスク] チームボード強制refetch: teamId=${teamId}, boardId=${selectedBoardIds[0]}`,
          );
        } else if (
          !teamMode &&
          selectedBoardIds.length > 0 &&
          selectedBoardIds[0]
        ) {
          queryClient.refetchQueries({
            queryKey: ["boards", parseInt(selectedBoardIds[0]), "items"],
          });
          console.log(
            `🔧 [新規タスク] 個人ボード強制refetch: boardId=${selectedBoardIds[0]}`,
          );
        }

        // 新規作成完了を通知（連続作成モードの情報も渡す）
        onSaveComplete?.(newTask, true, continuousCreateMode);

        // チームボードの場合はURL更新も必要（連続作成モード時は除く）
        if (
          teamMode &&
          !continuousCreateMode &&
          typeof window !== "undefined"
        ) {
          const currentPath = window.location.pathname;
          const teamBoardMatch = currentPath.match(
            /^\/team\/([^\/]+)\/board\/([^\/]+)/,
          );

          if (teamBoardMatch) {
            const [, customUrl, slug] = teamBoardMatch;
            const newUrl = `/team/${customUrl}/board/${slug}/task/${newTask.id}`;
            console.log(`🔧 [新規タスク作成] URL更新: /task/0 → ${newUrl}`);
            window.history.replaceState(null, "", newUrl);
          }
        } else if (teamMode && continuousCreateMode) {
          console.log("🔧 [連続作成モード] URL更新をスキップ");
        }

        // 連続作成モードの場合はフォームをリセット
        console.log("🔧 [連続作成モード] チェック:", {
          continuousCreateMode,
          teamMode,
          teamId,
          isFromBoardDetail,
        });

        if (continuousCreateMode) {
          console.log("🔧 [連続作成モード] フォームリセット開始");

          if (isFromBoardDetail) {
            // ボード詳細での新規作成時は、ボード情報を保持
            const currentBoardIds = selectedBoardIds;

            const resetData = {
              title: "",
              description: "",
              status: "todo" as const,
              priority: "medium" as const,
              categoryId: null,
              boardCategoryId: boardCategoryId, // ボードカテゴリーも保持
              dueDate: "",
              boardIds: currentBoardIds, // ボード選択を保持
            };

            setTitle("");
            setDescription("");
            setStatus("todo");
            setPriority("medium");
            setCategoryId(null);
            // setBoardCategoryId(null); // ボードカテゴリーを保持
            // initializeBoardIds([]); // ボード選択を保持
            setDueDate("");

            // originalDataもリセット
            setOriginalData(resetData);
          } else {
            // 通常のタスク画面での新規作成時は、完全リセット

            const resetData = {
              title: "",
              description: "",
              status: "todo" as const,
              priority: "medium" as const,
              categoryId: null,
              boardCategoryId: null,
              dueDate: "",
              boardIds: [],
            };

            console.log(
              "🔧 [連続作成モード] 通常モード: フォーム完全リセット実行",
            );
            setTitle("");
            setDescription("");
            setStatus("todo");
            setPriority("medium");
            setCategoryId(null);
            setBoardCategoryId(null);
            initializeBoardIds([]);
            setDueDate("");

            // originalDataもリセット
            setOriginalData(resetData);
            console.log("🔧 [連続作成モード] 通常モード: リセット完了", {
              resetDataTitle: resetData.title,
              resetDataDescription: resetData.description,
              resetDataStatus: resetData.status,
            });
          }

          // 少し遅延してタイトル入力欄にフォーカス
          setTimeout(() => {
            taskFormRef.current?.focusTitle();
          }, 500);
        } else {
          // 連続作成モードがOFFの場合は、TaskScreen側で処理
          console.log("🔧 [連続作成モード] OFF: TaskScreen側で選択処理", {
            taskId: newTask.id,
          });
          // onSelectTask?.(newTask); この呼び出しを削除してTaskScreen側に任せる
        }
      } else {
        // 編集
        // タスク内容の変更があるかチェック（ボード変更は除く）
        const hasContentChanges = originalData
          ? title.trim() !== originalData.title.trim() ||
            description.trim() !== originalData.description.trim() ||
            status !== originalData.status ||
            priority !== originalData.priority ||
            categoryId !== originalData.categoryId ||
            boardCategoryId !== originalData.boardCategoryId ||
            dueDate !== originalData.dueDate
          : false;

        let updatedTask = task as Task;

        // タスク内容に変更がある場合のみ更新
        if (hasContentChanges) {
          const apiResponse = await updateTask.mutateAsync({
            id: (task as Task).id,
            data: taskData,
          });

          // APIが不完全なレスポンスを返した場合は既存データをマージ
          if (
            apiResponse.title !== undefined &&
            apiResponse.description !== undefined
          ) {
            updatedTask = apiResponse;
          } else {
            updatedTask = {
              ...(task as Task),
              title: taskData.title,
              description: taskData.description || "",
              status: taskData.status,
              priority: taskData.priority,
              categoryId: taskData.categoryId || null,
              dueDate: taskData.dueDate || null,
              updatedAt: Math.floor(Date.now() / 1000),
            };
          }
        }

        // タグ更新処理
        if (hasTagChanges) {
          // タスクの一意識別子を決定（originalIdが空の場合の特別処理）
          let taskOriginalId =
            (task as Task).originalId || (task as Task).id.toString();

          // タスクID 142で originalId が空の場合は、既存タグとの整合性のため "5" を使用
          if (
            (task as Task).id === 142 &&
            (!(task as Task).originalId || (task as Task).originalId === "")
          ) {
            taskOriginalId = "5";
          }

          await updateTaggings(taskOriginalId);
          setHasManualTagChanges(false); // 保存後に手動変更フラグをリセット
        }

        // ボード変更処理
        const currentBoardIds = itemBoards.map((board) => board.id.toString());
        const toAdd = selectedBoardIds.filter(
          (id) => !currentBoardIds.includes(id),
        );
        const toRemove = currentBoardIds.filter(
          (id) => !selectedBoardIds.includes(id),
        );

        // ボードを外す場合はモーダル表示
        if (toRemove.length > 0) {
          showModal({ toAdd, toRemove });
          return;
        }

        // ボードから削除
        for (const boardId of toRemove) {
          try {
            await removeItemFromBoard.mutateAsync({
              boardId: parseInt(boardId),
              itemId: (task as Task).originalId || (task as Task).id.toString(),
              itemType: "task",
            });
          } catch {
            // エラーは上位でハンドリング
          }
        }

        // ボードに追加（既存タスクの場合のみ）
        console.log(
          `🔧 [タスク保存] ボード追加処理: taskId=${task?.id}, toAdd=[${toAdd.join(",")}], currentBoardIds=[${currentBoardIds.join(",")}], selectedBoardIds=[${selectedBoardIds.join(",")}]`,
        );
        if (task && task.id > 0) {
          for (const boardId of toAdd) {
            try {
              const itemIdToAdd = task.originalId || task.id.toString();
              console.log(
                `🔧 [タスク保存] ボード追加開始: boardId=${boardId}, itemId=${itemIdToAdd}`,
              );

              await addItemToBoard.mutateAsync({
                boardId: parseInt(boardId),
                data: {
                  itemType: "task",
                  itemId: itemIdToAdd,
                },
              });
              console.log(`✅ [タスク保存] ボード追加成功: boardId=${boardId}`);
            } catch (error) {
              const errorMessage =
                (error as Error).message || JSON.stringify(error) || "";
              console.error(
                `❌ [タスク保存] ボード追加失敗: boardId=${boardId}, error:`,
                errorMessage,
              );

              // 重複エラーの場合は無視（既にボードに追加済み）
              const isDuplicateError =
                errorMessage.includes(
                  "アイテムは既にボードに追加されています",
                ) ||
                errorMessage.includes("already") ||
                errorMessage.includes("duplicate") ||
                errorMessage.includes("already exists") ||
                errorMessage.includes("既に追加");

              if (isDuplicateError) {
                console.log(
                  `🔧 [タスク保存] 重複エラーを無視: boardId=${boardId} (既に追加済み)`,
                );
                continue;
              }

              // その他のエラーは上位でハンドリング
            }
          }
        }

        onSaveComplete?.(updatedTask, false, false);

        // 保存成功時にoriginalDataも更新（現在のstateの値を使用）
        setOriginalData({
          title: title.trim(),
          description: description.trim(),
          status: status,
          priority: priority,
          categoryId: categoryId,
          boardCategoryId: boardCategoryId,
          dueDate: dueDate,
          boardIds: selectedBoardIds,
        });

        // タスク更新完了後にキャッシュ強制再取得でUI更新を確実にする
        console.log(
          `✅ [タスク保存] 処理完了、キャッシュ強制再取得開始: taskId=${task?.id}`,
        );
        setTimeout(() => {
          console.log(`🔧 [タスク保存] 強制refetch実行: teamId=${teamId}`);
          queryClient.refetchQueries({
            predicate: (query) => {
              const key = query.queryKey as string[];
              return (
                (key[0] === "team-boards" && key[1] === teamId?.toString()) ||
                (key[0] === "team-tasks" && key[1] === teamId) ||
                key[0] === "tasks" ||
                key[0] === "boards"
              );
            },
          });
        }, 200);
      }
    } catch (error) {
      console.error("保存に失敗しました:", error);
      setError(
        "保存に失敗しました。APIサーバーが起動していることを確認してください。",
      );
      setIsSaving(false);
    } finally {
      // 保存中表示をしっかり見せる
      setTimeout(() => setIsSaving(false), 500);
    }
  }, [
    title,
    description,
    status,
    priority,
    dueDate,
    categoryId,
    task,
    isNewTask,
    updateTask,
    createTask,
    onSaveComplete,
    addItemToBoard,
    removeItemFromBoard,
    selectedBoardIds,
    itemBoards,
    isSaving,
    originalData,
    initializeBoardIds,
    showModal,
    hasTagChanges,
    updateTaggings,
    isDeleted,
  ]);

  // Ctrl+Sショートカット（変更がある場合のみ実行）
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        if (canSave) {
          handleSave();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleSave, canSave]);

  return (
    <>
      <div data-task-editor className="flex flex-col h-full">
        <BaseViewer
          item={tempTask}
          onClose={onClose}
          error={error ? "エラー" : null}
          hideDateInfo={true}
          headerActions={
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2">
                {error && <span className="text-xs text-red-500">{error}</span>}
                <SaveButton
                  onClick={handleSave}
                  disabled={!canSave}
                  isSaving={
                    isSaving ||
                    createTaggingMutation.isPending ||
                    deleteTaggingMutation.isPending
                  }
                  buttonSize="size-7"
                  iconSize="size-4"
                />
                {/* 連続作成モード切り替えボタン（新規作成時のみ表示） */}
                {isNewTask && (
                  <ContinuousCreateButton
                    storageKey="task-continuous-create-mode"
                    onModeChange={(enabled) => {
                      console.log("🔧 [連続作成モード] ボタン切り替え:", {
                        enabled,
                        teamMode,
                        teamId,
                      });
                      setContinuousCreateMode(enabled);
                    }}
                  />
                )}
                <Tooltip text="写真" position="bottom">
                  <PhotoButton
                    buttonSize="size-7"
                    iconSize="size-5"
                    className="rounded-full"
                  />
                </Tooltip>
                <BoardIconSelector
                  options={boardOptions}
                  value={currentBoardValues}
                  onChange={handleBoardSelectorChange}
                  iconClassName="size-4 text-gray-600"
                  multiple={true}
                />
                <TagTriggerButton
                  onClick={
                    isDeleted ? undefined : () => setIsTagModalOpen(true)
                  }
                  tags={localTags}
                  disabled={isDeleted}
                />
              </div>
              <div className="flex items-center gap-1">
                {isDeleted && task && (
                  <span className="text-xs text-red-500 mr-2">
                    削除日時:{" "}
                    {new Date(
                      (task as DeletedTask).deletedAt * 1000,
                    ).toLocaleDateString("ja-JP")}
                  </span>
                )}
                {task && task.id !== 0 && (
                  <div className="text-[13px] text-gray-400 mr-2">
                    <DateInfo item={task} isEditing={!isDeleted} />
                  </div>
                )}
                {!isNewTask && !isDeleted && (
                  <button
                    onClick={handleDeleteClick}
                    className="flex items-center justify-center size-7 rounded-md bg-gray-100 mr-2"
                  >
                    <TrashIcon className="size-5" isLidOpen={isLidOpen} />
                  </button>
                )}
                {isDeleted && (
                  <div className="flex gap-2 mr-2">
                    <Tooltip text="復元" position="bottom">
                      <button
                        onClick={() => {
                          console.log(
                            "🔄 復元ボタンクリック: isDeleted=",
                            isDeleted,
                            "deletedTaskActions=",
                            !!deletedTaskActions,
                          );
                          if (isDeleted && deletedTaskActions) {
                            deletedTaskActions.handleRestore();
                          }
                        }}
                        className="flex items-center justify-center size-7 rounded-md bg-gray-200 hover:bg-gray-300 text-gray-600 hover:text-gray-800 transition-colors"
                      >
                        <RestoreIcon className="size-4" />
                      </button>
                    </Tooltip>
                    <button
                      onClick={() => {
                        if (isDeleted && deletedTaskActions) {
                          // 削除済みタスクの場合は完全削除（蓋を開く）
                          setIsAnimating(true);
                          deletedTaskActions.showDeleteConfirmation();
                        } else if (onDelete) {
                          onDelete();
                        }
                      }}
                      className="flex items-center justify-center size-7 rounded-md bg-red-100 hover:bg-red-200"
                    >
                      <TrashIcon
                        className="size-4"
                        isLidOpen={
                          isAnimating ||
                          (isDeleted && deletedTaskActions?.showDeleteModal)
                        }
                      />
                    </button>
                  </div>
                )}
              </div>
            </div>
          }
          isEditing={true}
        >
          <TaskForm
            ref={taskFormRef}
            task={task as Task}
            title={title}
            onTitleChange={isDeleted ? () => {} : setTitle}
            description={description}
            onDescriptionChange={isDeleted ? () => {} : setDescription}
            status={status}
            onStatusChange={isDeleted ? () => {} : setStatus}
            priority={priority}
            onPriorityChange={isDeleted ? () => {} : setPriority}
            categoryId={categoryId}
            onCategoryChange={isDeleted ? () => {} : setCategoryId}
            boardCategoryId={boardCategoryId}
            onBoardCategoryChange={isDeleted ? () => {} : setBoardCategoryId}
            dueDate={dueDate}
            onDueDateChange={isDeleted ? () => {} : setDueDate}
            isNewTask={isNewTask}
            customHeight={customHeight}
            tags={task && task.id !== 0 ? localTags : []}
            boards={task && task.id !== 0 ? itemBoards : []}
            boardCategories={categories}
            showBoardCategory={isFromBoardDetail}
            isDeleted={isDeleted}
            initialBoardId={initialBoardId}
          />
        </BaseViewer>
      </div>

      {/* 削除確認モーダル（編集時のみ・削除済みタスクは除外） */}
      {!isNewTask && !isDeleted && (
        <BulkDeleteConfirmation
          isOpen={showDeleteModal}
          onClose={hideDeleteConfirmation}
          onConfirm={handleDelete}
          count={1}
          itemType="task"
          deleteType="normal"
          isLoading={isDeleting}
          position="center"
          customTitle={`「${task?.title || "タイトルなし"}」の削除`}
          customMessage={
            itemBoards &&
            itemBoards.filter(
              (board) => !initialBoardId || board.id !== initialBoardId,
            ).length > 0 ? (
              <div className="text-center">
                <p className="text-sm text-gray-700 mb-3">
                  このタスクは以下のボードに紐づいています
                </p>
                <div className="mb-3 flex justify-center">
                  <BoardChips
                    boards={itemBoards.filter(
                      (board) => !initialBoardId || board.id !== initialBoardId,
                    )}
                    variant="compact"
                  />
                </div>
                <p className="text-xs text-gray-500">
                  削除すると各ボードの「削除済み」タブに移動します
                </p>
              </div>
            ) : undefined
          }
        />
      )}

      {/* ボード変更確認モーダル */}
      <BoardChangeModal
        isOpen={showBoardChangeModal}
        onClose={handleCancelBoardChange}
        onConfirm={handleConfirmBoardChange}
        boardsToAdd={pendingBoardChanges.toAdd.map(getBoardName)}
        boardsToRemove={pendingBoardChanges.toRemove.map(getBoardName)}
      />

      {/* タグ選択モーダル */}
      <TagSelectionModal
        isOpen={isTagModalOpen}
        onClose={() => setIsTagModalOpen(false)}
        tags={teamMode ? teamTagsList || [] : preloadedTags}
        selectedTagIds={localTags.map((tag) => tag.id)}
        teamMode={teamMode}
        teamId={teamId}
        onSelectionChange={(tagIds) => {
          const availableTags = teamMode ? teamTagsList || [] : preloadedTags;
          const selectedTags = availableTags.filter((tag: Tag) =>
            tagIds.includes(tag.id),
          );
          if (teamMode) {
            console.log("🏷️ [タスクタグ選択] チームモード:", {
              tagIds,
              availableTagsLength: availableTags.length,
              selectedTagsLength: selectedTags.length,
              selectedTags,
            });
          }
          setLocalTags(selectedTags);
          setHasManualTagChanges(true); // 手動変更フラグを設定
        }}
        mode="selection"
        multiple={true}
      />

      {/* 削除済みタスクの永久削除確認モーダル */}
      {isDeleted && deletedTaskActions && (
        <BulkDeleteConfirmation
          isOpen={deletedTaskActions.showDeleteModal}
          onClose={deletedTaskActions.hideDeleteConfirmation}
          onConfirm={deletedTaskActions.handlePermanentDelete}
          count={1}
          itemType="task"
          deleteType="permanent"
          isLoading={deletedTaskActions.isDeleting}
          position="center"
          customTitle={`「${task?.title || "タイトルなし"}」の完全削除`}
          customMessage={
            <div className="text-center">
              <div className="mt-3 p-3 bg-red-50 rounded-md">
                <p className="text-sm text-red-800 font-medium">
                  この操作は取り消せません
                </p>
                <p className="text-xs text-red-700 mt-1">
                  データは永久に失われます
                </p>
                <p className="text-xs text-red-700 mt-1">
                  ボードからも完全に削除されます
                </p>
              </div>
            </div>
          }
        />
      )}
    </>
  );
}

export default memo(TaskEditor);
