"use client";

import BaseViewer from "@/components/shared/base-viewer";
import { BulkDeleteConfirmation } from "@/components/ui/modals";
import ConfirmationModal from "@/components/ui/modals/confirmation-modal";
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
import type { Editor } from "@tiptap/react";
import CustomSelector from "@/components/ui/selectors/custom-selector";
import { DatePickerSimple } from "@/components/ui/date-picker-simple";
import BoardCategorySelector from "@/components/features/board-categories/board-category-selector";
import AssigneeSelector from "./assignee-selector";
import MobileSelectorModal from "./mobile-selector-modal";
import { TiptapEditor, Toolbar } from "../memo/tiptap-editor";
import BoardTagDisplay from "@/components/shared/board-tag-display";
import { Menu } from "lucide-react";
import {
  getPriorityEditorColor,
  getPriorityText,
  getStatusEditorColor,
  getStatusText,
} from "@/src/utils/taskUtils";
import { useSimpleItemSave } from "@/src/hooks/use-simple-item-save";
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
import { useAttachmentManager } from "@/src/hooks/use-attachment-manager";
import AttachmentGallery from "@/components/features/attachments/attachment-gallery";
import { useTeamTags } from "@/src/hooks/use-team-tags";
import {
  useAllTeamTaggings,
  useCreateTeamTagging,
  useDeleteTeamTagging,
  useDeleteTeamTaggingByTag,
} from "@/src/hooks/use-team-taggings";
import { useBoardCategories } from "@/src/hooks/use-board-categories";
import BoardChangeModal from "@/components/ui/modals/board-change-modal";
import type { Task, DeletedTask } from "@/src/types/task";
import type { Tag, Tagging } from "@/src/types/tag";
import type { Board } from "@/src/types/board";
import { OriginalIdUtils } from "@/src/types/common";
import { useCallback, useEffect, useState, useMemo, memo, useRef } from "react";
import type { DragEvent } from "react";
import { useDeletedTaskActions } from "./use-deleted-task-actions";
import ShareUrlButton from "@/components/ui/buttons/share-url-button";
import {
  generateTeamShareUrl,
  extractTeamNameFromUrl,
} from "@/src/utils/urlUtils";
import { useTeamContext } from "@/src/contexts/team-context";
import { useTeamDetail } from "@/src/contexts/team-detail-context";
import { useTeamDetail as useTeamDetailQuery } from "@/src/hooks/use-team-detail";
import { useNavigation } from "@/src/contexts/navigation-context";

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
  preloadedItemBoards?: Board[]; // 親で取得済みのアイテム紐づけボード（優先的に使用）

  // 作成者情報
  createdBy?: string | null;
  createdByUserId?: string | null;
  createdByAvatarColor?: string | null;

  // チーム用の未保存変更管理（オプション）
  taskEditorHasUnsavedChangesRef?: React.MutableRefObject<boolean>;
  taskEditorShowConfirmModalRef?: React.MutableRefObject<(() => void) | null>;

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
  task: rawTask,
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
  preloadedItemBoards,
  createdBy,
  createdByUserId,
  createdByAvatarColor,
  unifiedOperations,
  taskEditorHasUnsavedChangesRef,
  taskEditorShowConfirmModalRef,
}: TaskEditorProps) {
  const {
    isTeamMode: teamMode,
    teamId: teamIdRaw,
    teamSlug,
  } = useTeamContext();
  const teamId = teamIdRaw ?? undefined; // Hook互換性のため変換

  // NavigationContextからアップロード状態を管理
  const { setIsUploadingTask } = useNavigation();

  // TeamDetailContext経由でモバイルフッターに状態を公開
  const teamDetailContext = teamMode ? useTeamDetail() : null;
  const { data: teamDetailData } = useTeamDetailQuery(teamSlug || "");
  const teamMembers = teamMode ? (teamDetailData?.members ?? []) : [];

  // IMPORTANT: originalIdを文字列として強制変換（ボードAPI経由だと数値になる場合がある）
  const task = rawTask
    ? ({
        ...rawTask,
        originalId:
          typeof rawTask.originalId === "string"
            ? rawTask.originalId
            : OriginalIdUtils.fromItem(rawTask) || rawTask.originalId,
      } as typeof rawTask)
    : rawTask;

  const queryClient = useQueryClient();

  // キャッシュから完全なタスクデータを取得
  const fullTask = useMemo(() => {
    if (!task || task.id === 0) return task;

    // propsのtaskにcategoryIdとboardCategoryIdが含まれていない場合、キャッシュから取得
    if (task.categoryId === undefined || task.boardCategoryId === undefined) {
      const queryKey = teamMode && teamId ? ["team-tasks", teamId] : ["tasks"];
      const cachedTasks = queryClient.getQueryData<Task[]>(queryKey);
      const cachedTask = cachedTasks?.find((t) => t.id === task.id);

      if (cachedTask) {
        console.log("🔄 [task-editor] キャッシュから完全なタスクを取得:", {
          id: cachedTask.id,
          categoryId: cachedTask.categoryId,
          boardCategoryId: cachedTask.boardCategoryId,
        });
        return cachedTask;
      }
    }

    console.log("🎯 [task-editor] 受け取ったtask:", {
      id: task.id,
      title: task.title,
      categoryId: task.categoryId,
      boardCategoryId: task.boardCategoryId,
    });

    return task;
  }, [
    task,
    task?.id,
    task?.categoryId,
    task?.boardCategoryId,
    teamMode,
    teamId,
    queryClient,
  ]);

  const { categories } = useBoardCategories(initialBoardId);

  // 削除済みタスクかどうかを判定
  const isDeleted = task ? "deletedAt" in task : false;

  // 書式設定ツールバーの表示状態
  const [toolbarVisible, setToolbarVisible] = useState(false);
  const [tiptapEditor, setTiptapEditor] = useState<Editor | null>(null);

  // モバイルセレクターモーダルの表示状態
  const [isMobileSelectorOpen, setIsMobileSelectorOpen] = useState(false);

  // 事前取得されたデータを使用（APIコール不要）
  const boards = preloadedBoards;
  const isNewTask = !task || task.id === 0;
  const titleInputRef = useRef<HTMLInputElement>(null);

  // セレクターのオプション
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

  // このタスクに実際に紐づいているボードのみを抽出
  const itemBoards = useMemo(() => {
    // 親で取得済みのデータがあれば優先的に使用（フェーズ1・2対応）
    if (preloadedItemBoards !== undefined) {
      return preloadedItemBoards;
    }

    // 以下は後方互換性のための既存ロジック（preloadedItemBoardsがない場合のみ実行）

    // 新規作成時でもinitialBoardIdがあれば含める
    if (!task || task.id === undefined || task.id === 0) {
      if (initialBoardId) {
        const initialBoard = preloadedBoards.find(
          (board) => board.id === initialBoardId,
        );
        return initialBoard ? [initialBoard] : [];
      }
      return [];
    }

    return [];
  }, [preloadedItemBoards, task, initialBoardId, preloadedBoards]);

  // 【最適化】個別取得をやめて一括取得を活用
  const originalId =
    task && task.id !== 0 ? OriginalIdUtils.fromItem(task) : null;

  // 個人モード: 個別タグ取得（従来通り）
  const { data: liveTaggings } = useTaggings({
    targetType: "task",
    targetOriginalId: originalId || undefined,
    teamMode,
    enabled: !teamMode, // チームモード時は呼ばない
  });

  // チーム用タグ一覧を取得
  const { data: teamTagsList } = useTeamTags(teamId || 0);

  // 画像添付機能（共通フック使用）
  const attachmentManager = useAttachmentManager({
    itemType: "task",
    item: task,
    teamMode,
    teamId,
    isDeleted,
  });

  const {
    attachments,
    pendingImages,
    pendingDeletes,
    handleFileSelect,
    handleFilesSelect,
    handleDeleteAttachment,
    handleDeletePendingImage,
    handleRestoreAttachment,
    uploadPendingImages,
    deletePendingAttachments,
    isDeleting: isAttachmentDeleting,
    isUploading,
  } = attachmentManager;

  const [isDragActive, setIsDragActive] = useState(false);
  const dragCounterRef = useRef<number>(0);

  const isFileDragEvent = useCallback((event: DragEvent<HTMLDivElement>) => {
    const types = event.dataTransfer?.types;
    if (!types || types.length === 0) return false;
    return Array.from(types).includes("Files");
  }, []);

  const handleDragEnter = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      if (isDeleted) return;
      if (!isFileDragEvent(event)) return;

      event.preventDefault();
      dragCounterRef.current += 1;
      setIsDragActive(true);
    },
    [isDeleted, isFileDragEvent],
  );

  const handleDragOver = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      if (isDeleted) return;
      if (!isFileDragEvent(event)) return;

      event.preventDefault();
      event.dataTransfer.dropEffect = "copy";
    },
    [isDeleted, isFileDragEvent],
  );

  const handleDragLeave = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      if (isDeleted) return;
      if (!isFileDragEvent(event)) return;

      event.preventDefault();
      dragCounterRef.current = Math.max(0, dragCounterRef.current - 1);
      if (dragCounterRef.current === 0) {
        setIsDragActive(false);
      }
    },
    [isDeleted, isFileDragEvent],
  );

  const handleDrop = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      if (isDeleted) return;
      if (!event.dataTransfer || !isFileDragEvent(event)) return;

      event.preventDefault();
      event.stopPropagation();

      const files = Array.from(event.dataTransfer.files || []).filter(
        (file) => file.size > 0,
      );
      if (files.length > 0) {
        handleFilesSelect(files);
      }

      dragCounterRef.current = 0;
      setIsDragActive(false);
    },
    [handleFilesSelect, isDeleted, isFileDragEvent],
  );

  // チームモード: 一括取得からフィルタリング
  // タスクID 142で originalId が空の場合は、既存タグとの整合性のため "5" を使用
  const teamOriginalId = useMemo(() => {
    if (!task || !teamMode) return null;
    if (task.id === 142 && (!task.originalId || task.originalId === "")) {
      return "5";
    }
    return originalId;
  }, [task, teamMode, originalId]);

  const { data: allTeamTaggings } = useAllTeamTaggings(teamId || 0);
  const liveTeamTaggings = useMemo(() => {
    if (!teamMode || !allTeamTaggings || !teamOriginalId) return [];
    return allTeamTaggings.filter(
      (tagging) =>
        tagging.targetType === "task" &&
        tagging.targetOriginalId === teamOriginalId,
    );
  }, [teamMode, allTeamTaggings, teamOriginalId]);

  // 事前取得されたデータとライブデータを組み合わせて現在のタグを取得
  const currentTags = useMemo(() => {
    if (!task || task.id === 0) return [];
    // タスクの一意識別子を決定（originalIdが空の場合の特別処理）
    let targetOriginalId = OriginalIdUtils.fromItem(task) || "";

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
  // 未保存変更確認モーダル
  const [isCloseConfirmModalOpen, setIsCloseConfirmModalOpen] = useState(false);

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
    assigneeId: formAssigneeId,
    categoryId,
    boardCategoryId,
    selectedBoardIds,
    isSaving,
    saveError,
    hasChanges,
    handleSave: saveTask,
    handleTitleChange,
    handleContentChange: handleDescriptionChange,
    handlePriorityChange,
    handleStatusChange,
    handleAssigneeChange,
    handleCategoryChange,
    handleBoardCategoryChange,
    handleBoardChange,
    showBoardChangeModal,
    pendingBoardChanges,
    handleConfirmBoardChange,
    handleCancelBoardChange,
    resetForm,
  } = useSimpleItemSave<Task>({
    item: fullTask && !("deletedAt" in fullTask) ? (fullTask as Task) : null,
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
        categoryId: categoryId ?? null,
        boardCategoryId: boardCategoryId ?? null,
        assigneeId: formAssigneeId ?? null,
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
        categoryId: categoryId ?? null,
        boardCategoryId: boardCategoryId ?? null,
        assigneeId: formAssigneeId ?? null,
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
                targetOriginalId: String(taskId),
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

  // 新規作成時の保存可能性チェック（タグ変更・画像変更も含める）
  const canSave = isDeleted
    ? false
    : isUploading
      ? false // アップロード中は保存不可
      : isNewTask
        ? !!title.trim()
        : (hasChanges ||
            hasTagChanges ||
            pendingImages.length > 0 ||
            pendingDeletes.length > 0) &&
          !!title.trim(); // 既存タスクも空タイトルの場合は保存不可

  // 未保存の変更があるかチェック
  const hasUnsavedChanges = isNewTask
    ? !!title.trim() || !!description.trim() || pendingImages.length > 0
    : hasChanges ||
      hasTagChanges ||
      pendingImages.length > 0 ||
      pendingDeletes.length > 0;

  // デバッグログ: canSave の計算過程
  useEffect(() => {
    console.log("🔍 canSave Debug:", {
      isDeleted,
      isUploading,
      isNewTask,
      title: title.trim(),
      hasChanges,
      hasTagChanges,
      pendingImagesLength: pendingImages.length,
      pendingDeletesLength: pendingDeletes.length,
      canSave,
      hasUnsavedChanges,
    });
  }, [
    isDeleted,
    isUploading,
    isNewTask,
    title,
    hasChanges,
    hasTagChanges,
    pendingImages,
    pendingDeletes,
    canSave,
    hasUnsavedChanges,
  ]);

  // チーム用の未保存変更refを更新（モバイルフッター戻るボタン用）
  useEffect(() => {
    if (taskEditorHasUnsavedChangesRef) {
      taskEditorHasUnsavedChangesRef.current = hasUnsavedChanges;
    }
  }, [hasUnsavedChanges, taskEditorHasUnsavedChangesRef]);

  // チーム用の確認モーダル表示関数を設定
  useEffect(() => {
    if (taskEditorShowConfirmModalRef) {
      taskEditorShowConfirmModalRef.current = () => {
        setIsCloseConfirmModalOpen(true);
      };
    }
  }, [taskEditorShowConfirmModalRef]);

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

  // 表示用のボード（現在の選択状態を反映、initialBoardIdは除外）
  const displayBoards = useMemo(() => {
    // 選択中のボードIDから、実際のボード情報を取得
    const selectedBoards = selectedBoardIds
      .map((id) => preloadedBoards.find((board) => board.id === id))
      .filter(
        (board): board is NonNullable<typeof board> => board !== undefined,
      )
      // initialBoardIdが指定されている場合（ボード詳細から呼ばれた場合）は、そのボードを除外
      .filter((board) => !initialBoardId || board.id !== initialBoardId);

    return selectedBoards;
  }, [selectedBoardIds, preloadedBoards, initialBoardId]);

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

    // 保存後の処理用のoriginalIdを取得
    let targetOriginalId =
      task && task.id > 0 ? OriginalIdUtils.fromItem(task) : null;

    // タグの変更がある場合は保存
    if (hasTagChanges && task && task.id !== 0) {
      const taskId = OriginalIdUtils.fromItem(task) || "";
      await updateTaggings(taskId);
    } else if (wasNewTask && (hasTagChanges || pendingImages.length > 0)) {
      // 新規作成でタグまたは画像がある場合
      await new Promise((resolve) => setTimeout(resolve, 100));

      const tasksQueryKey = teamMode
        ? (["team-tasks", teamId] as const)
        : (["tasks"] as const);
      const tasksQuery = queryClient.getQueryData<Task[]>(tasksQueryKey);
      if (tasksQuery && tasksQuery.length > 0) {
        const latestTask = [...tasksQuery].sort(
          (a, b) => b.createdAt - a.createdAt,
        )[0];

        if (latestTask) {
          targetOriginalId = OriginalIdUtils.fromItem(latestTask) || "";
          if (hasTagChanges) {
            await updateTaggings(targetOriginalId);
          }
        }
      }
    }

    // 削除予定の画像を削除
    const hasDeletes = pendingDeletes.length > 0;
    const hasUploads = pendingImages.length > 0;

    if (hasDeletes) {
      await deletePendingAttachments();
    }

    // 保存待ちの画像を一括アップロード（完了トーストはuploadPendingImagesが表示）
    if (hasUploads && targetOriginalId) {
      await uploadPendingImages(targetOriginalId);
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
    pendingImages,
    pendingDeletes,
    uploadPendingImages,
    deletePendingAttachments,
    queryClient,
    teamMode,
    teamId,
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

  // モバイルフッター戻るボタンイベント（Context経由）
  useEffect(() => {
    const handleMobileBackRequested = () => {
      // アップロード中・保存中は閉じられない
      if (isUploading || isSaving) {
        return;
      }

      if (teamMode && teamDetailContext) {
        // Contextから最新の状態を読み取る
        const currentHasUnsavedChanges =
          teamDetailContext.taskEditorHasUnsavedChangesRef.current;
        const showModal =
          teamDetailContext.taskEditorShowConfirmModalRef.current;

        if (currentHasUnsavedChanges && showModal) {
          showModal();
        } else {
          onClose();
        }
      } else {
        // 個人ページの場合は直接判定
        if (hasUnsavedChanges) {
          setIsCloseConfirmModalOpen(true);
        } else {
          onClose();
        }
      }
    };

    window.addEventListener(
      "team-back-to-task-list",
      handleMobileBackRequested,
    );
    return () => {
      window.removeEventListener(
        "team-back-to-task-list",
        handleMobileBackRequested,
      );
    };
  }, [
    teamMode,
    teamDetailContext,
    hasUnsavedChanges,
    onClose,
    isUploading,
    isSaving,
  ]);

  // アップロード中状態をNavigationContextに同期
  useEffect(() => {
    setIsUploadingTask(isUploading);
    return () => {
      setIsUploadingTask(false);
    };
  }, [isUploading, setIsUploadingTask]);

  // 保存中・アップロード中になったら未保存確認モーダルを強制的に閉じる
  useEffect(() => {
    if ((isSaving || isUploading) && isCloseConfirmModalOpen) {
      setIsCloseConfirmModalOpen(false);
    }
  }, [isSaving, isUploading, isCloseConfirmModalOpen]);

  // 戻るボタンクリックハンドラー（未保存変更チェック＆アップロード中チェック）
  const handleCloseClick = useCallback(() => {
    // アップロード中・保存中は閉じられない
    if (isUploading || isSaving) {
      return;
    }
    if (hasUnsavedChanges) {
      setIsCloseConfirmModalOpen(true);
    } else {
      onClose();
    }
  }, [isUploading, isSaving, hasUnsavedChanges, onClose]);

  // 確認モーダルで「閉じる」を選択
  const handleConfirmClose = useCallback(() => {
    setIsCloseConfirmModalOpen(false);
    onClose();
  }, [onClose]);

  return (
    <>
      <div
        data-task-editor
        className="flex flex-col h-full relative overflow-x-hidden"
      >
        {/* 固定ヘッダー部分 */}
        <div className="flex-shrink-0 pl-2 pt-2 md:relative fixed top-0 left-0 right-0 z-50 bg-white">
          <div className="flex justify-start items-center">
            {/* ここにheaderActionsの内容を直接配置 */}
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2">
                {/* 閉じるボタン（PCのみ表示、モバイルではフッターに表示） */}
                <button
                  onClick={handleCloseClick}
                  disabled={isUploading || isSaving}
                  className={`hidden md:flex items-center justify-center size-7 rounded-md bg-gray-100 text-gray-600 transition-colors ${
                    isUploading || isSaving
                      ? "opacity-50 cursor-not-allowed"
                      : "hover:bg-gray-200 hover:text-gray-800"
                  }`}
                >
                  <svg
                    className="size-4 rotate-180 md:rotate-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </button>
                {/* 書式設定トグルボタン */}
                {!isDeleted && (
                  <Tooltip text="書式設定" position="bottom">
                    <button
                      type="button"
                      onClick={() => setToolbarVisible(!toolbarVisible)}
                      className={`flex items-center justify-center size-7 rounded-md transition-colors ${
                        toolbarVisible
                          ? "bg-gray-300 text-gray-700"
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      }`}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="size-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129"
                        />
                      </svg>
                    </button>
                  </Tooltip>
                )}
                {!isDeleted && (
                  <>
                    {/* 連続作成モード切り替えボタン（新規作成時のみ表示） */}
                    {isNewTask && (
                      <ContinuousCreateButton
                        storageKey="task-continuous-create-mode"
                        onModeChange={(enabled) => {
                          setContinuousCreateMode(enabled);
                        }}
                      />
                    )}
                    <Tooltip text="写真" position="bottom">
                      <PhotoButton
                        buttonSize="size-7"
                        iconSize="size-5"
                        className="rounded-full"
                        onFilesSelect={handleFilesSelect}
                        multiple={true}
                        disabled={isDeleted}
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
                      teamMode={teamMode}
                    />
                    {/* チーム機能でのURL共有ボタン */}
                    {shareUrl && (
                      <ShareUrlButton
                        url={shareUrl}
                        className=""
                        label="URLをコピー"
                      />
                    )}
                    {/* 削除ボタン */}
                    {!isNewTask && !isDeleted && handleDelete && (
                      <button
                        onClick={handleDeleteClick}
                        className="flex items-center justify-center size-7 rounded-md bg-gray-100"
                      >
                        <TrashIcon className="size-5" />
                      </button>
                    )}
                  </>
                )}
              </div>
              <div className="flex items-center gap-2">
                {error && <span className="text-xs text-red-500">{error}</span>}
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
                {isDeleted && (
                  <div className="flex gap-2 mr-2">
                    <Tooltip text="復元" position="bottom">
                      <button
                        onClick={() => {
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
                <SaveButton
                  onClick={handleSave}
                  disabled={!canSave}
                  isSaving={
                    isSaving ||
                    isUploading ||
                    createTaggingMutation.isPending ||
                    deleteTaggingMutation.isPending
                  }
                  buttonSize="size-9"
                  iconSize="size-5"
                  className="mr-2"
                />
              </div>
            </div>
          </div>

          {/* タイトル・ステータス・日付を固定ヘッダーに配置 */}
          <>
            {/* タイトル入力 */}
            <div className="flex items-center gap-1">
              <input
                ref={titleInputRef}
                type="text"
                placeholder="タスクタイトルを入力..."
                value={finalTitle}
                onChange={(e) =>
                  isDeleted ? undefined : handleTitleChange(e.target.value)
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                  }
                }}
                className="flex-1 mb-1 mt-1 text-[15px] md:text-lg font-medium border-b border-DeepBlue/80 outline-none focus:border-DeepBlue"
              />
            </div>

            {/* セレクターバー */}
            <div className="flex gap-1.5 mt-1">
              <div className="w-[85px] md:w-20">
                <CustomSelector
                  label="ステータス"
                  options={statusOptions}
                  value={
                    finalStatus === "not_started"
                      ? "todo"
                      : (finalStatus as string)
                  }
                  onChange={(value) => {
                    if (!isDeleted && handleStatusChange) {
                      handleStatusChange(
                        value === "todo"
                          ? "not_started"
                          : (value as
                              | "in_progress"
                              | "completed"
                              | "not_started"),
                      );
                    }
                  }}
                  fullWidth
                  disabled={isDeleted}
                  hideLabel={true}
                  compactMode={true}
                  hideChevron={true}
                />
              </div>

              <CustomSelector
                label="優先度"
                options={priorityOptions}
                value={finalPriority as string}
                onChange={(value) =>
                  isDeleted
                    ? undefined
                    : handlePriorityChange?.(value as "low" | "medium" | "high")
                }
                fullWidth
                disabled={isDeleted}
                hideLabel={true}
                compactMode={true}
                hideChevron={true}
              />

              {/* PC（md以上）: 全セレクター表示 */}
              <div className="hidden md:flex gap-1.5">
                {teamMode && handleAssigneeChange && (
                  <div className="w-24 md:w-28">
                    <AssigneeSelector
                      members={teamMembers}
                      value={formAssigneeId ?? null}
                      onChange={isDeleted ? () => {} : handleAssigneeChange}
                      disabled={isDeleted}
                      width="100%"
                      compact
                      hideLabel
                      className="flex-shrink-0"
                      compactMode
                    />
                  </div>
                )}

                <div className="w-40">
                  <BoardCategorySelector
                    value={boardCategoryId ?? null}
                    onChange={
                      isDeleted
                        ? () => {}
                        : handleBoardCategoryChange || (() => {})
                    }
                    categories={categories}
                    boardId={initialBoardId!}
                    disabled={isDeleted}
                    allowCreate={true}
                    hideChevron={true}
                    compactMode
                  />
                </div>

                <div className="w-28 mr-2">
                  <DatePickerSimple
                    value={dueDate}
                    onChange={isDeleted ? () => {} : setDueDate}
                    disabled={isDeleted}
                    compactMode={true}
                    placeholder="期限"
                  />
                </div>
              </div>

              {/* スマホ（md未満）: メニューボタン */}
              <button
                onClick={() => setIsMobileSelectorOpen(true)}
                disabled={isDeleted}
                className="md:hidden flex items-center gap-1.5 px-3 h-7 border border-gray-400 rounded-lg bg-white hover:opacity-80 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Menu size={16} className="text-gray-600" />
                <span className="text-sm text-gray-700">メニュー</span>
              </button>
            </div>

            {/* モバイルセレクターモーダル */}
            <MobileSelectorModal
              isOpen={isMobileSelectorOpen}
              onClose={() => setIsMobileSelectorOpen(false)}
              teamMode={teamMode}
              formAssigneeId={formAssigneeId}
              handleAssigneeChange={handleAssigneeChange}
              teamMembers={teamMembers}
              boardCategoryId={boardCategoryId ?? null}
              setBoardCategoryId={handleBoardCategoryChange || (() => {})}
              categories={categories}
              initialBoardId={initialBoardId!}
              dueDate={dueDate}
              setDueDate={setDueDate}
              isDeleted={isDeleted}
            />

            {/* 作成者・日付を表示（ツールバー非表示時のみ） */}
            {task && task.id !== 0 && !toolbarVisible && (
              <div className="flex justify-end items-center gap-2 mr-2 mt-1 mb-1">
                <CreatorAvatar
                  createdBy={createdBy}
                  avatarColor={createdByAvatarColor}
                  teamMode={teamMode}
                  size="md"
                  className=""
                />
                <DateInfo
                  item={task as Task}
                  isEditing={!isDeleted}
                  size="sm"
                />
              </div>
            )}

            {/* 書式ツールバー（ツールバー表示時のみ） */}
            {!isDeleted && toolbarVisible && (
              <Toolbar editor={tiptapEditor || null} />
            )}
          </>
        </div>

        {/* スクロール可能なコンテンツ部分 */}
        <div className="flex-1 min-h-0 overflow-y-auto md:pt-0 pt-[130px]">
          <div
            className={`relative h-full rounded-lg border border-transparent transition-colors ${
              isDragActive ? "border-dashed border-blue-400 bg-blue-50/40" : ""
            }`}
            onDragEnter={handleDragEnter}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            {isDragActive && (
              <div className="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center rounded-lg bg-blue-50/80 text-sm font-medium text-blue-600">
                ここにドロップして画像を追加
              </div>
            )}
            <div className="relative z-20">
              <div className="flex-1 flex flex-col min-h-0 pl-2">
                <div className="w-full pr-1">
                  <TiptapEditor
                    content={finalDescription}
                    onChange={(newContent) => {
                      if (!isDeleted) {
                        handleDescriptionChange(newContent);
                      }
                    }}
                    placeholder={isDeleted ? "削除済みのタスクです" : "入力..."}
                    readOnly={isDeleted}
                    className="font-medium"
                    toolbarVisible={toolbarVisible}
                    onToolbarToggle={setToolbarVisible}
                    onEditorReady={setTiptapEditor}
                    onImagePaste={handleFileSelect}
                  />
                </div>

                {/* ボード名・タグ表示 */}
                <BoardTagDisplay
                  boards={displayBoards}
                  tags={task && task.id !== 0 ? localTags : []}
                  spacing="normal"
                  showWhen="has-content"
                  className="mb-4"
                />
              </div>
              {/* 画像添付ギャラリー（個人・チーム両対応） */}
              <AttachmentGallery
                attachments={attachments}
                onDelete={handleDeleteAttachment}
                isDeleting={isAttachmentDeleting}
                pendingImages={pendingImages}
                onDeletePending={handleDeletePendingImage}
                pendingDeletes={pendingDeletes}
                onRestore={handleRestoreAttachment}
                isUploading={isUploading}
              />
            </div>
          </div>
        </div>
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

      {/* 未保存変更確認モーダル */}
      <ConfirmationModal
        isOpen={isCloseConfirmModalOpen && !isSaving && !isUploading}
        onClose={() => setIsCloseConfirmModalOpen(false)}
        onConfirm={handleConfirmClose}
        title="未保存の変更があります"
        message="保存せずに閉じると、変更内容が失われます。よろしいですか？"
        confirmText="閉じる"
        cancelText="キャンセル"
        variant="warning"
        icon="warning"
      />
    </>
  );
}

export default memo(TaskEditor);
