"use client";

import BaseViewer from "@/components/shared/base-viewer";
import { BulkDeleteConfirmation } from "@/components/ui/modals";
import BoardChips from "@/components/ui/chips/board-chips";
import SaveButton from "@/components/ui/buttons/save-button";
import PhotoButton from "@/components/ui/buttons/photo-button";
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
import {
  useCreateTagging,
  useDeleteTagging,
  useTaggings,
} from "@/src/hooks/use-taggings";
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
  onSaveComplete?: (savedTask: Task, isNewTask: boolean) => void;
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
}: TaskEditorProps) {
  const updateTask = useUpdateTask();
  const createTask = useCreateTask();
  const addItemToBoard = useAddItemToBoard();
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

    // このタスクに紐づいているボードアイテムを抽出
    const taskBoardItems = preloadedBoardItems.filter(
      (item) => item.itemType === "task" && item.originalId === originalId,
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

  // ライブタグデータ取得（メモエディターと同様）
  const originalId =
    task && task.id !== 0 ? task.originalId || task.id.toString() : null;
  const { data: liveTaggings } = useTaggings({
    targetType: "task",
    targetOriginalId: originalId || undefined,
  });

  // 事前取得されたデータとライブデータを組み合わせて現在のタグを取得
  const currentTags = useMemo(() => {
    if (!task || task.id === 0) return [];
    const targetOriginalId = task.originalId || task.id.toString();

    // ライブデータがある場合は優先的に使用、なければ事前取得データを使用
    const taggingsToUse =
      liveTaggings ||
      preloadedTaggings.filter(
        (t) =>
          t.targetType === "task" && t.targetOriginalId === targetOriginalId,
      );

    const tags = taggingsToUse.map((t) => t.tag).filter(Boolean) as Tag[];


    return tags;
  }, [task, liveTaggings, preloadedTaggings]);

  // タグ操作用のmutation
  const createTaggingMutation = useCreateTagging();
  const deleteTaggingMutation = useDeleteTagging();

  // ローカルタグ状態
  const [localTags, setLocalTags] = useState<Tag[]>([]);
  const [prevTaskId, setPrevTaskId] = useState<number | null>(null);
  const [isTagModalOpen, setIsTagModalOpen] = useState(false);

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
      // 既存タスクの場合は、itemBoardsとinitialBoardIdの両方を含める
      const boardIds = itemBoards.map((board) => board.id.toString());
      // initialBoardIdが指定されていて、まだ含まれていない場合は追加
      if (initialBoardId && !boardIds.includes(initialBoardId.toString())) {
        boardIds.push(initialBoardId.toString());
      }
      return boardIds;
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

        setOriginalData({
          title: taskTitle.trim(),
          description: taskDescription.trim(),
          status: taskStatus as "todo" | "in_progress" | "completed",
          priority: taskPriority as "low" | "medium" | "high",
          categoryId: task.categoryId || null,
          boardCategoryId: task.boardCategoryId || null,
          dueDate: taskDueDate,
          boardIds: itemBoards.map((board) => board.id.toString()),
        });
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
        JSON.stringify(localTags.map((t) => t.id).sort())
    ) {
      setLocalTags(currentTags);
    }
  }, [task?.id, prevTaskId, currentTags, localTags]);

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
    },
    [
      task,
      currentTags,
      localTags,
      preloadedTaggings,
      deleteTaggingMutation,
      createTaggingMutation,
    ],
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

  // 変更があるかチェック（useMemoで最適化）
  const hasChanges = useMemo(() => {
    if (!originalData) return false; // originalDataがない間は保存ボタンを無効に

    // ボードの変更をチェック
    const boardsChanged =
      JSON.stringify(selectedBoardIds.sort()) !==
      JSON.stringify(originalData.boardIds.sort());

    return (
      title.trim() !== originalData.title.trim() ||
      description.trim() !== originalData.description.trim() ||
      status !== originalData.status ||
      priority !== originalData.priority ||
      categoryId !== originalData.categoryId ||
      boardCategoryId !== originalData.boardCategoryId ||
      dueDate !== originalData.dueDate ||
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
        } catch {
          // エラーは上位でハンドリング
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
          } catch {
            // エラーは上位でハンドリング
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

      onSaveComplete?.(task as Task, false);

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
        const newTask = await createTask.mutateAsync(taskData);

        // 選択されたボードに追加
        if (selectedBoardIds.length > 0 && newTask.id) {
          try {
            for (const boardId of selectedBoardIds) {
              await addItemToBoard.mutateAsync({
                boardId: parseInt(boardId),
                data: {
                  itemType: "task",
                  itemId: newTask.originalId || newTask.id.toString(),
                },
              });
            }
          } catch {
            // エラーは上位でハンドリング
          }
        }

        // 新規作成完了を通知
        onSaveComplete?.(newTask, true);

        // 新規作成後はフォームをリセット
        setTimeout(() => {
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
          }

          // 少し遅延してタイトル入力欄にフォーカス
          setTimeout(() => {
            taskFormRef.current?.focusTitle();
          }, 100);
        }, 400);
      } else {
        // 編集
        // タスク内容の変更があるかチェック（ボード変更は除く）
        const hasContentChanges =
          title.trim() !== originalData!.title.trim() ||
          description.trim() !== originalData!.description.trim() ||
          status !== originalData!.status ||
          priority !== originalData!.priority ||
          categoryId !== originalData!.categoryId ||
          boardCategoryId !== originalData!.boardCategoryId ||
          dueDate !== originalData!.dueDate;

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
          await updateTaggings(
            (task as Task).originalId || (task as Task).id.toString(),
          );
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
        if (task && task.id > 0) {
          for (const boardId of toAdd) {
            try {
              const itemIdToAdd = task.originalId || task.id.toString();

              await addItemToBoard.mutateAsync({
                boardId: parseInt(boardId),
                data: {
                  itemType: "task",
                  itemId: itemIdToAdd,
                },
              });
            } catch (error) {
              console.error("Failed to add to board:", error);
              // エラーは上位でハンドリング
            }
          }
        }

        onSaveComplete?.(updatedTask, false);

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
                  onClick={() => setIsTagModalOpen(true)}
                  tags={localTags}
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
        tags={preloadedTags}
        selectedTagIds={localTags.map((tag) => tag.id)}
        onSelectionChange={(tagIds) => {
          const selectedTags = preloadedTags.filter((tag) =>
            tagIds.includes(tag.id),
          );
          setLocalTags(selectedTags);
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
