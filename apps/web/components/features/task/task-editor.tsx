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
import CreatorAvatar from "@/components/shared/creator-avatar";
import type { TeamCreatorProps } from "@/src/types/creator";
import TaskForm, { TaskFormHandle } from "./task-form";
import { useSimpleItemSave } from "@/src/hooks/use-simple-item-save";
import {
  useAddItemToBoard,
  useRemoveItemFromBoard,
  // useTeamItemBoards, // 使用停止：API 404エラーのため
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
import { useBoardCategories } from "@/src/hooks/use-board-categories";
import BoardChangeModal from "@/components/ui/modals/board-change-modal";
import type { Task, DeletedTask } from "@/src/types/task";
import type { Tag, Tagging } from "@/src/types/tag";
import type { Board } from "@/src/types/board";
import { useCallback, useEffect, useState, useMemo, memo, useRef } from "react";
import { useDeletedTaskActions } from "./use-deleted-task-actions";
import ShareUrlButton from "@/components/ui/buttons/share-url-button";
import {
  generateTeamShareUrl,
  extractTeamNameFromUrl,
} from "@/src/utils/urlUtils";

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
  onRestoreAndSelectNext?: () => void;
  onDelete?: () => void;
  customHeight?: string;
  showDateAtBottom?: boolean; // 日付を下に表示するか（デフォルト: false = ヘッダー右側）

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

  // チーム機能と作成者情報
  teamMode?: boolean;
  teamId?: number;
  createdBy?: string | null;
  createdByUserId?: string | null;
  createdByAvatarColor?: string | null;

  // 統一操作フック
  unifiedOperations?: {
    deleteItem: {
      mutateAsync: (id: number) => Promise<any>;
      isPending: boolean;
    };
    restoreItem: {
      mutateAsync: (originalId: string) => Promise<any>;
      isPending: boolean;
    };
  };
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
  onRestoreAndSelectNext,
  onDelete,
  customHeight,
  showDateAtBottom = false,
  preloadedTags = [],
  preloadedBoards = [],
  preloadedTaggings = [],
  preloadedBoardItems = [],
  teamMode = false,
  teamId,
  createdBy,
  createdByUserId,
  createdByAvatarColor,
  unifiedOperations,
}: TaskEditorProps) {
  const queryClient = useQueryClient();
  const { categories } = useBoardCategories(initialBoardId);

  // 削除済みタスクかどうかを判定
  const isDeleted = task ? "deletedAt" in task : false;

  // 事前取得されたデータを使用（APIコール不要）
  const boards = preloadedBoards;
  const isNewTask = !task || task.id === 0;
  const taskFormRef = useRef<TaskFormHandle>(null);

  // チームモードでも preloadedBoardItems を使用するため API 呼び出しは不要
  // const teamItemId = task?.originalId || task?.id?.toString();
  // const { data: teamItemBoards = [] } = useTeamItemBoards(
  //   teamId || 0,
  //   "task",
  //   teamItemId,
  // );

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

    // デバッグログ: 個人用ボード紐づけ情報を出力
    console.log("🔍 [TaskEditor] 個人用ボード紐づけ情報:", {
      taskId: task?.id,
      taskOriginalId: originalId,
      teamMode,
      teamId,
      initialBoardId,
      preloadedBoardItemsCount: preloadedBoardItems.length,
      taskBoardItems,
      taskBoardItemsCount: taskBoardItems.length,
      foundBoardsCount: boards.length,
      foundBoards: boards.map((b) => ({ id: b.id, name: b.name })),
    });

    return boards;
  }, [
    task,
    preloadedBoardItems,
    preloadedBoards,
    initialBoardId,
    teamMode,
    teamId,
  ]);

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

  // タグ初期化（タスクが変わった時のみ実行）
  useEffect(() => {
    const currentTaskId = task?.id || 0;

    if (currentTaskId !== prevTaskId) {
      setLocalTags(currentTags);
      setPrevTaskId(currentTaskId);
      setHasManualTagChanges(false); // タスク切り替え時は手動変更フラグをリセット
    }
  }, [task?.id, currentTags, prevTaskId]);

  // currentTagsが変更されたときにlocalTagsも同期（外部からのタグ変更を反映）
  // 但し、手動変更フラグがある場合は同期しない（ユーザーの操作を優先）
  useEffect(() => {
    // タスクが同じで、currentTagsが変更された場合のみ同期
    if (
      task?.id === prevTaskId &&
      JSON.stringify(currentTags.map((t) => t.id).sort()) !==
        JSON.stringify(localTags.map((t) => t.id).sort()) &&
      !hasManualTagChanges // 手動変更がない場合のみ同期
    ) {
      setLocalTags(currentTags);
    }
  }, [task?.id, prevTaskId, currentTags, localTags, hasManualTagChanges]);

  // preloadedTagsが更新された時にlocalTagsの最新情報を反映
  useEffect(() => {
    // チームモード・個人モード両方で preloadedTags の更新を反映
    if (localTags.length === 0 || preloadedTags.length === 0) {
      return;
    }

    const updatedLocalTags = localTags.map((localTag) => {
      const updatedTag = preloadedTags.find((tag) => tag.id === localTag.id);
      return updatedTag || localTag;
    });

    // 実際に変更があった場合のみ更新
    const hasChanges = updatedLocalTags.some(
      (tag, index) =>
        tag.name !== localTags[index]?.name ||
        tag.color !== localTags[index]?.color,
    );

    if (hasChanges) {
      setLocalTags(updatedLocalTags);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preloadedTags, teamMode]);

  // チームタグが更新された時にlocalTagsの最新情報を反映（チームモードのみ）
  useEffect(() => {
    // 個人モードの時はチームタグでの更新を行わない
    if (
      !teamMode ||
      localTags.length === 0 ||
      !teamTagsList ||
      teamTagsList.length === 0
    ) {
      return;
    }

    const updatedLocalTags = localTags.map((localTag) => {
      const updatedTag = teamTagsList.find((tag) => tag.id === localTag.id);
      return updatedTag || localTag;
    });

    // 実際に変更があった場合のみ更新
    const hasChanges = updatedLocalTags.some(
      (tag, index) =>
        tag.name !== localTags[index]?.name ||
        tag.color !== localTags[index]?.color,
    );

    if (hasChanges) {
      setLocalTags(updatedLocalTags);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamTagsList, teamMode]);

  // 削除関連の状態
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = unifiedOperations
    ? async () => {
        if (!task || task.id === 0) return;
        setShowDeleteModal(false); // モーダルを閉じる
        setIsDeleting(true);
        try {
          // task-screen.tsxの削除処理に委任（API削除+次選択を一括処理）
          await onDeleteAndSelectNext?.(task as Task);
          // ボード詳細では削除フック側でモーダル制御するため、onClose()は不要
        } catch (error) {
          console.error("削除に失敗:", error);
        } finally {
          setIsDeleting(false);
        }
      }
    : onDelete || onDeleteAndSelectNext
      ? async () => {
          if (!task || task.id === 0) return;
          setShowDeleteModal(false); // モーダルを閉じる
          setIsDeleting(true);
          try {
            // チームボード詳細等から渡された削除処理を実行
            if (onDeleteAndSelectNext) {
              await onDeleteAndSelectNext(task as Task);
            } else if (onDelete) {
              await onDelete();
            }
          } catch (error) {
            console.error("削除に失敗:", error);
          } finally {
            setIsDeleting(false);
          }
        }
      : undefined;

  const showDeleteConfirmation = () => setShowDeleteModal(true);
  const hideDeleteConfirmation = () => {
    setShowDeleteModal(false);
    setIsAnimating(false); // 蓋を閉じる
  };

  // アニメーション状態管理
  const [isAnimating, setIsAnimating] = useState(false);

  // 削除済みタスクの操作用（React Hooks違反を避けるため常に呼び出し、nullを許可）
  const deletedTaskActions = useDeletedTaskActions({
    task: isDeleted ? (task as DeletedTask) : null,
    onClose,
    onDeleteAndSelectNext: () => {
      if (onDelete) onDelete();
    },
    onRestoreAndSelectNext: undefined, // TaskScreenで処理するため無効化
    onAnimationChange: setIsAnimating,
    teamMode,
    teamId: teamId || undefined,
    boardId: initialBoardId || undefined,
  });

  // 削除ボタンのハンドラー（ボード紐づきチェック付き）
  const handleDeleteClick = () => {
    if (!handleDelete) return; // unifiedOperationsがない場合は何もしない
    setIsAnimating(true); // 蓋を開く

    if (itemBoards && itemBoards.length > 0) {
      // ボードに紐づいている場合はモーダル表示
      showDeleteConfirmation();
    } else {
      // ボードに紐づいていない場合も同様にモーダル表示
      showDeleteConfirmation();
    }
  };

  // 初期ボードIDs配列の計算
  const currentBoardIds = useMemo(() => {
    const ids = itemBoards.map((board) => board.id);

    // デバッグログ: currentBoardIds計算結果
    console.log("🔢 [TaskEditor] currentBoardIds計算結果:", {
      itemBoardsCount: itemBoards.length,
      currentBoardIds: ids,
      itemBoards: itemBoards.map((b) => ({ id: b.id, name: b.name })),
    });

    return ids;
  }, [itemBoards]);

  // 連続作成モード状態（新規作成時のみ有効）
  const [continuousCreateMode, setContinuousCreateMode] = useState(() =>
    getContinuousCreateMode("task-continuous-create-mode"),
  );

  // 統合フックの使用
  const {
    title,
    content: description,
    priority,
    status,
    selectedBoardIds,
    isSaving,
    saveError,
    hasChanges,
    handleSave: saveTask,
    handleTitleChange,
    handleContentChange: handleDescriptionChange,
    handlePriorityChange,
    handleStatusChange,
    handleBoardChange,
    showBoardChangeModal,
    pendingBoardChanges,
    handleConfirmBoardChange,
    handleCancelBoardChange,
    resetForm,
  } = useSimpleItemSave<Task>({
    item: task && !("deletedAt" in task) ? (task as Task) : null,
    itemType: "task",
    onSaveComplete: useCallback(
      (savedTask: Task, wasEmpty: boolean, isNewTask: boolean) => {
        onSaveComplete?.(savedTask, isNewTask, continuousCreateMode);
      },
      [onSaveComplete, continuousCreateMode],
    ),
    currentBoardIds,
    initialBoardId,
    boardId: initialBoardId, // チームボードキャッシュ更新用
    onDeleteAndSelectNext,
    teamMode,
    teamId,
  });

  // 連続作成モード時のフォームリセット処理
  useEffect(() => {
    // 保存完了後にリセットが必要かチェック
    if (
      continuousCreateMode &&
      isNewTask &&
      !isSaving &&
      !title &&
      !description
    ) {
      // 空のフォームに戻った場合（保存後）はリセット完了とみなす
      return;
    }
  }, [continuousCreateMode, isNewTask, isSaving, title, description]);

  // 削除済みタスクの場合は直接タスクデータから値を取得
  const finalTitle = isDeleted ? task?.title || "" : title;
  const finalDescription = isDeleted ? task?.description || "" : description;
  const finalPriority = isDeleted
    ? (task as DeletedTask)?.priority || "medium"
    : priority;
  const finalStatus = isDeleted
    ? (task as DeletedTask)?.status || "not_started"
    : status;

  // その他のタスク固有のstate
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

  const [error, setError] = useState<string | null>(null);

  // 新規作成・編集両対応の仮タスクオブジェクト
  const tempTask: Task = task
    ? {
        ...(task as Task),
        title: finalTitle || task.title,
        description: finalDescription,
        status:
          finalStatus === "not_started"
            ? "todo"
            : (finalStatus as "todo" | "in_progress" | "completed"),
        priority: finalPriority as "low" | "medium" | "high",
        categoryId: categoryId,
        boardCategoryId: boardCategoryId,
        dueDate: dueDate
          ? Math.floor(new Date(dueDate).getTime() / 1000)
          : null,
      }
    : {
        id: 0,
        title: finalTitle || "新規タスク",
        description: finalDescription,
        status:
          finalStatus === "not_started"
            ? "todo"
            : (finalStatus as "todo" | "in_progress" | "completed"),
        priority: finalPriority as "low" | "medium" | "high",
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

  // 新規作成時の保存可能性チェック（タグ変更も含める）
  const canSave = isDeleted
    ? false
    : isNewTask
      ? !!title.trim()
      : hasChanges || hasTagChanges;

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

  // デバッグログ: selectedBoardIdsの状態
  console.log("🎯 [TaskEditor] selectedBoardIds状態:", {
    selectedBoardIds,
    selectedBoardIdsCount: selectedBoardIds.length,
    currentBoardValues,
    currentBoardValuesCount: currentBoardValues.length,
  });

  // ボード選択変更ハンドラー
  const handleBoardSelectorChange = (value: string | string[]) => {
    const values = Array.isArray(value) ? value : [value];
    const boardIds = values.filter((v) => v !== "").map((v) => parseInt(v, 10));
    handleBoardChange(boardIds);
  };

  // チーム機能でのURL共有用
  const shareUrl = useMemo(() => {
    if (!teamMode || !task || task.id === 0) return null;

    const teamName = extractTeamNameFromUrl();
    if (!teamName) return null;

    return generateTeamShareUrl({
      teamName,
      tab: "tasks",
      itemId: task.id,
    });
  }, [teamMode, task]);

  const handleSave = useCallback(async () => {
    if (!title.trim() || isSaving || isDeleted) return;

    // 保存前の状態を記録
    const wasNewTask = isNewTask;
    const hasContent = title.trim() || description.trim();

    await saveTask();

    // タグの変更がある場合は保存
    if (hasTagChanges && task && task.id !== 0) {
      const taskId = task.originalId || task.id.toString();
      await updateTaggings(taskId);
    }

    // 連続作成モードで新規タスクの場合、保存後にリセット
    if (continuousCreateMode && wasNewTask && hasContent) {
      setTimeout(() => {
        resetForm();
      }, 200);
    }
  }, [
    title,
    description,
    isSaving,
    isDeleted,
    saveTask,
    isNewTask,
    continuousCreateMode,
    resetForm,
    hasTagChanges,
    task,
    updateTaggings,
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
      <div data-task-editor className="flex flex-col h-full relative">
        <BaseViewer
          item={tempTask}
          onClose={onClose}
          error={error ? "エラー" : null}
          hideDateInfo={true}
          headerActions={
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2">
                <button
                  onClick={onClose}
                  className="flex items-center justify-center size-7 rounded-md bg-gray-100 hover:bg-gray-200 text-gray-600 hover:text-gray-800 transition-colors"
                >
                  <svg
                    className="size-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 19l-7-7 7-7"
                    />
                  </svg>
                </button>
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
                {/* チーム機能でのURL共有ボタン */}
                {shareUrl && (
                  <ShareUrlButton
                    url={shareUrl}
                    className=""
                    label="タスクのURLをコピーして共有"
                  />
                )}
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
                {/* ヘッダー右側にアバター・日付を表示（showDateAtBottom=falseの場合） */}
                {!showDateAtBottom && task && task.id !== 0 && (
                  <>
                    <CreatorAvatar
                      createdBy={createdBy || task?.createdBy}
                      avatarColor={createdByAvatarColor || task?.avatarColor}
                      teamMode={teamMode}
                      size="lg"
                      className="mr-2"
                    />
                    <DateInfo item={task} isEditing={!isDeleted} />
                  </>
                )}
                {!isNewTask && !isDeleted && handleDelete && (
                  <button
                    onClick={handleDeleteClick}
                    className="flex items-center justify-center size-7 rounded-md bg-gray-100 mr-2"
                  >
                    <TrashIcon className="size-5" />
                  </button>
                )}
                {isDeleted && (
                  <div className="flex gap-2 mr-2">
                    <Tooltip text="復元" position="bottom">
                      <button
                        onClick={() => {
                          console.log(
                            "🔄 TaskEditor復元ボタン: 統一復元処理呼び出し",
                          );
                          // MemoEditorと同じ統一化：onRestoreAndSelectNext || onRestore
                          const restoreHandler =
                            onRestoreAndSelectNext || onRestore;
                          if (isDeleted && restoreHandler && task) {
                            restoreHandler();
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
                      <TrashIcon className="size-4" />
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
            title={finalTitle}
            onTitleChange={isDeleted ? () => {} : handleTitleChange}
            description={finalDescription}
            onDescriptionChange={isDeleted ? () => {} : handleDescriptionChange}
            status={
              finalStatus === "not_started"
                ? "todo"
                : (finalStatus as "todo" | "in_progress" | "completed")
            }
            onStatusChange={
              isDeleted
                ? () => {}
                : (value) =>
                    handleStatusChange?.(
                      value === "todo" ? "not_started" : value,
                    )
            }
            priority={finalPriority as "low" | "medium" | "high"}
            onPriorityChange={isDeleted ? () => {} : handlePriorityChange!}
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
            teamMode={teamMode}
          />

          {/* 日付情報とアバターアイコンを右下に配置（showDateAtBottom=trueの場合のみ） */}
          {showDateAtBottom && task && task.id !== 0 && (
            <div className="flex justify-end items-center gap-2 mb-3 mr-2">
              {/* チーム機能: 作成者アイコン */}
              <CreatorAvatar
                createdBy={createdBy || task?.createdBy}
                avatarColor={createdByAvatarColor || task?.avatarColor}
                teamMode={teamMode}
                size="lg"
                className=""
              />
              {/* 日付情報 */}
              <DateInfo item={task} isEditing={!isDeleted} />
            </div>
          )}
        </BaseViewer>
      </div>

      {/* 削除確認モーダル（編集時のみ・削除済みタスクは除外） */}
      {!isNewTask && !isDeleted && (
        <BulkDeleteConfirmation
          isOpen={showDeleteModal}
          onClose={hideDeleteConfirmation}
          onConfirm={handleDelete || (() => {})}
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
        boardsToAdd={pendingBoardChanges.boardsToAdd.map((id) =>
          getBoardName(id.toString()),
        )}
        boardsToRemove={pendingBoardChanges.boardsToRemove.map((id) =>
          getBoardName(id.toString()),
        )}
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
