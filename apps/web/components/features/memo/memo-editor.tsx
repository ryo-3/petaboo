"use client";

import BaseViewer from "@/components/shared/base-viewer";
import PhotoButton from "@/components/ui/buttons/photo-button";
import SaveButton from "@/components/ui/buttons/save-button";
import ConfirmationModal from "@/components/ui/modals/confirmation-modal";
import ContinuousCreateButton, {
  getContinuousCreateMode,
} from "@/components/ui/buttons/continuous-create-button";
import TrashIcon from "@/components/icons/trash-icon";
import BoardIconSelector from "@/components/ui/selectors/board-icon-selector";
import Tooltip from "@/components/ui/base/tooltip";
import BoardChangeModal from "@/components/ui/modals/board-change-modal";
import { BulkDeleteConfirmation } from "@/components/ui/modals/confirmation-modal";
import TagTriggerButton from "@/components/features/tags/tag-trigger-button";
import TagSelectionModal from "@/components/ui/modals/tag-selection-modal";
import { useSimpleItemSave } from "@/src/hooks/use-simple-item-save";
import { useAddItemToBoard } from "@/src/hooks/use-boards";
import { useTeamContext } from "@/src/contexts/team-context";
import { useTeamDetail } from "@/src/contexts/team-detail-context";
import {
  useCreateTagging,
  useDeleteTagging,
  useTaggings,
} from "@/src/hooks/use-taggings";
import {
  useCreateTeamTagging,
  useDeleteTeamTaggingByTag,
  useAllTeamTaggings,
} from "@/src/hooks/use-team-taggings";
import { useTeamTags } from "@/src/hooks/use-team-tags";
import { useDeletedMemoActions } from "./use-deleted-memo-actions";
import { useQueryClient } from "@tanstack/react-query";
import { useAttachmentManager } from "@/src/hooks/use-attachment-manager";
import AttachmentGallery from "@/components/features/attachments/attachment-gallery";
import { useToast } from "@/src/contexts/toast-context";
import ShareUrlButton from "@/components/ui/buttons/share-url-button";
import {
  generateTeamShareUrl,
  extractTeamNameFromUrl,
} from "@/src/utils/urlUtils";
import BoardTagDisplay from "@/components/shared/board-tag-display";
import BoardChips from "@/components/ui/chips/board-chips";
import UserMemberCard from "@/components/shared/user-member-card";
import DateInfo from "@/components/shared/date-info";
import CreatorAvatar from "@/components/shared/creator-avatar";
import type { TeamCreatorProps } from "@/src/types/creator";
import type { Memo, DeletedMemo } from "@/src/types/memo";
import type { Tag, Tagging } from "@/src/types/tag";
import type { Board } from "@/src/types/board";
import { OriginalIdUtils } from "@/src/types/common";
import { useEffect, useRef, useState, memo, useMemo, useCallback } from "react";
import type { DragEvent } from "react";
import { TiptapEditor, Toolbar } from "./tiptap-editor";
import type { Editor } from "@tiptap/react";
import { useAuth } from "@clerk/nextjs";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:7594";

interface MemoEditorProps {
  memo: Memo | DeletedMemo | null;
  initialBoardId?: number;
  onClose: () => void;
  onSaveComplete?: (
    savedMemo: Memo,
    wasEmpty: boolean,
    isNewMemo: boolean,
  ) => void;
  onDelete?: () => void;
  onDeleteAndSelectNext?: (deletedMemo: Memo | DeletedMemo) => void;
  onRestore?: () => void; // 削除済み復元用
  onRestoreAndSelectNext?: (deletedMemo: DeletedMemo) => void; // 削除済み復元後の次選択用
  isLidOpen?: boolean;
  customHeight?: string;
  showDateAtBottom?: boolean; // 日付を下に表示するか（デフォルト: false = ヘッダー右側）
  // 統一操作フック（親から渡される）
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
  totalDeletedCount?: number; // 削除済みアイテムの総数
  insideBoardDetail?: boolean; // ボード詳細内で表示されているか（戻るボタンのイベント切り替え用）
}

function MemoEditor({
  memo,
  initialBoardId,
  onClose,
  onSaveComplete,
  onDelete,
  onDeleteAndSelectNext,
  onRestore,
  onRestoreAndSelectNext,
  isLidOpen = false,
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
  totalDeletedCount = 0,
  unifiedOperations,
  insideBoardDetail = false,
}: MemoEditorProps) {
  const { isTeamMode: teamMode, teamId: teamIdRaw } = useTeamContext();
  const teamId = teamIdRaw ?? undefined; // Hook互換性のため変換
  const { getToken } = useAuth();

  // ログを一度だけ出力（useEffectで管理）
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const baseViewerRef = useRef<HTMLDivElement>(null);

  // 削除済みメモかどうかを判定
  const isDeleted = memo ? "deletedAt" in memo : false;
  const deletedMemo = isDeleted ? (memo as DeletedMemo) : null;

  // 事前取得されたデータを使用（APIコール不要）
  const boards = preloadedBoards;

  // このメモに実際に紐づいているボードのみを抽出
  const itemBoards = useMemo(() => {
    // 親で取得済みのデータがあれば優先的に使用（フェーズ1・2対応）
    if (preloadedItemBoards !== undefined) {
      return preloadedItemBoards;
    }

    // 以下は後方互換性のための既存ロジック（preloadedItemBoardsがない場合のみ実行）
    if (!memo || memo.id === undefined || memo.id === 0) return [];

    const originalId = OriginalIdUtils.fromItem(memo) || "";

    // このメモに紐づいているボードアイテムを抽出
    const memoBoardItems = preloadedBoardItems.filter(
      (item) => item.itemType === "memo" && item.originalId === originalId,
    );

    // ボードアイテムからボード情報を取得
    const boards = memoBoardItems
      .map((item) => preloadedBoards.find((board) => board.id === item.boardId))
      .filter(
        (board): board is NonNullable<typeof board> => board !== undefined,
      );

    return boards;
  }, [preloadedItemBoards, memo, preloadedBoardItems, preloadedBoards]);

  const currentBoardIds =
    memo && memo.id !== 0
      ? itemBoards.length > 0
        ? itemBoards.map((board) => board.id) // ボードが存在する場合
        : initialBoardId
          ? [initialBoardId] // 保存直後でpreloadedBoardItemsが更新されていない場合はinitialBoardIdを使用
          : []
      : initialBoardId
        ? [initialBoardId]
        : [];

  // 連続作成モード状態（新規作成時のみ有効）
  const [continuousCreateMode, setContinuousCreateMode] = useState(() =>
    getContinuousCreateMode("memo-continuous-create-mode"),
  );

  const [localTags, setLocalTags] = useState<Tag[]>([]);
  const [hasManualChanges, setHasManualChanges] = useState(false);
  const resetFormRef = useRef<(() => void) | null>(null);

  const simpleItemSave = useSimpleItemSave<Memo>({
    item: memo,
    itemType: "memo",
    onSaveComplete: useCallback(
      (savedMemo: Memo, wasEmpty: boolean, isNewMemo: boolean) => {
        lastSavedMemoRef.current = savedMemo;
        // 新規メモ作成で連続作成モードが有効な場合
        if (isNewMemo && !wasEmpty && continuousCreateMode) {
          // タグをリセット
          setLocalTags([]);
          setHasManualChanges(false);
          // フォームを手動でリセット
          setTimeout(() => {
            resetFormRef.current?.();
          }, 50);
          return; // onSaveCompleteを呼ばずに新規作成状態を維持
        }
        pendingSaveResultRef.current = {
          savedMemo,
          wasEmpty,
          isNewMemo,
        };
      },
      [continuousCreateMode, setHasManualChanges, setLocalTags],
    ),
    currentBoardIds,
    initialBoardId,
    onDeleteAndSelectNext,
    teamMode,
    teamId,
    boardId: initialBoardId, // チームボードキャッシュ更新用
  });

  const {
    content,
    selectedBoardIds,
    isSaving,
    saveError,
    hasChanges,
    handleSave,
    handleTitleChange,
    handleContentChange,
    handleBoardChange,
    showBoardChangeModal,
    pendingBoardChanges,
    handleConfirmBoardChange,
    handleCancelBoardChange,
    resetForm,
  } = simpleItemSave;

  useEffect(() => {
    resetFormRef.current = resetForm ?? null;
  }, [resetForm]);

  const [error] = useState<string | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const queryClient = useQueryClient();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [prevMemoId, setPrevMemoId] = useState<number | null>(null);
  const [isTagModalOpen, setIsTagModalOpen] = useState(false);
  const [toolbarVisible, setToolbarVisible] = useState(false);
  const [tiptapEditor, setTiptapEditor] = useState<Editor | null>(null);
  const lastSavedMemoRef = useRef<Memo | null>(
    memo && memo.id ? (memo as Memo) : null,
  );
  const pendingSaveResultRef = useRef<{
    savedMemo: Memo;
    wasEmpty: boolean;
    isNewMemo: boolean;
  } | null>(null);

  const flushPendingSaveResult = useCallback(() => {
    if (!pendingSaveResultRef.current) {
      return;
    }
    const { savedMemo, wasEmpty, isNewMemo } = pendingSaveResultRef.current;
    pendingSaveResultRef.current = null;
    onSaveComplete?.(savedMemo, wasEmpty, isNewMemo);
  }, [onSaveComplete]);
  // 未保存変更確認モーダル
  const [isCloseConfirmModalOpen, setIsCloseConfirmModalOpen] = useState(false);

  // 【最適化】個別取得をやめて一括取得を活用
  const originalId = OriginalIdUtils.fromItem(memo);

  // 個人モード: 個別タグ取得（従来通り）
  const { data: liveTaggings } = useTaggings({
    targetType: "memo",
    targetOriginalId: originalId,
    teamMode: teamMode,
    enabled: !teamMode, // チームモード時は呼ばない
  });

  // チームモード: 一括取得からフィルタリング
  const { data: allTeamTaggings } = useAllTeamTaggings(teamId || 0);
  const liveTeamTaggings = useMemo(() => {
    if (!teamMode || !allTeamTaggings || !originalId) return [];
    return allTeamTaggings.filter(
      (tagging) =>
        tagging.targetType === "memo" &&
        tagging.targetOriginalId === originalId,
    );
  }, [teamMode, allTeamTaggings, originalId]);

  // チーム用タグ一覧を取得
  const { data: teamTagsList } = useTeamTags(teamId || 0);

  // 画像添付機能（共通フック使用）
  const { showToast } = useToast();
  const attachmentManager = useAttachmentManager({
    itemType: "memo",
    item: memo,
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
    isDeleting,
    isUploading,
  } = attachmentManager;

  const addItemToBoard = useAddItemToBoard({ teamMode, teamId });

  const invalidateBoardCaches = useCallback(() => {
    if (teamMode && teamId) {
      queryClient.invalidateQueries({
        queryKey: ["boards", "all-items", teamId],
      });
      if (initialBoardId) {
        queryClient.invalidateQueries({
          queryKey: ["team-boards", teamId.toString(), initialBoardId, "items"],
        });
      }
    } else {
      queryClient.invalidateQueries({ queryKey: ["boards", "all-items"] });
      if (initialBoardId) {
        queryClient.invalidateQueries({
          queryKey: ["boards", initialBoardId, "items"],
        });
      }
    }
  }, [teamMode, teamId, initialBoardId, queryClient]);

  const [isDragActive, setIsDragActive] = useState(false);
  const dragCounterRef = useRef<number>(0);

  const resetDragState = useCallback(() => {
    dragCounterRef.current = 0;
    setIsDragActive(false);
  }, []);

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

      resetDragState();
    },
    [handleFilesSelect, isDeleted, isFileDragEvent, resetDragState],
  );

  // プリロードデータとライブデータを組み合わせてタグを抽出
  const currentTags = useMemo(() => {
    if (!memo || memo.id === undefined || memo.id === 0) return [];
    const targetOriginalId = OriginalIdUtils.fromItem(memo) || "";

    // チームモードかどうかに応じてタグ付け情報を選択
    // liveデータを優先し、取得できない場合はpreloadedTaggingsからフィルタリング
    const taggingsToUse = teamMode
      ? liveTeamTaggings && liveTeamTaggings.length > 0
        ? liveTeamTaggings
        : preloadedTaggings
      : liveTaggings && liveTaggings.length > 0
        ? liveTaggings
        : preloadedTaggings;

    const tags = taggingsToUse
      .filter(
        (t) =>
          t.targetType === "memo" && t.targetOriginalId === targetOriginalId,
      )
      .map((t) => t.tag)
      .filter(Boolean) as Tag[];

    return tags;
  }, [memo, preloadedTaggings, liveTaggings, liveTeamTaggings, teamMode]);

  // タグ操作用のmutation（既存API使用）
  const createTaggingMutation = useCreateTagging();
  const deleteTaggingMutation = useDeleteTagging();

  // チーム用タグ操作フック
  const createTeamTaggingMutation = useCreateTeamTagging(teamId || 0);
  const deleteTeamTaggingByTagMutation = useDeleteTeamTaggingByTag(teamId || 0);

  // nnキーで連続作成モード切り替え（新規作成時のみ）
  useEffect(() => {
    if (memo && memo.id !== 0) return; // 新規作成時のみ有効

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
  }, [memo]);

  // 削除済みメモの操作用（React Hooks違反を避けるため常に呼び出し、nullを許可）
  const deletedMemoActions = useDeletedMemoActions({
    memo: isDeleted ? deletedMemo : null,
    onClose,
    onDeleteAndSelectNext,
    onRestoreAndSelectNext: onRestoreAndSelectNext || onRestore,
    onAnimationChange: setIsAnimating,
    teamMode,
    teamId,
    boardId: initialBoardId,
    skipAutoSelectionOnRestore: false, // 復元時に次のアイテムを選択
    totalDeletedCount, // 削除済みアイテムの総数
  });

  // タグ初期化（メモが変わった時のみ実行）
  useEffect(() => {
    const currentMemoId = memo?.id || 0;

    if (currentMemoId !== prevMemoId) {
      setLocalTags(currentTags);
      setPrevMemoId(currentMemoId);
    }
  }, [memo?.id, currentTags, prevMemoId]);

  // currentTagsが変更されたときにlocalTagsも同期（外部からのタグ変更を反映）
  // 但し、手動変更フラグがある場合は同期しない（ユーザーの操作を優先）
  useEffect(() => {
    // メモが同じで、currentTagsが変更された場合のみ同期
    if (
      memo?.id === prevMemoId &&
      JSON.stringify(currentTags.map((t) => t.id).sort()) !==
        JSON.stringify(localTags.map((t) => t.id).sort()) &&
      !hasManualChanges // 手動変更がない場合のみ同期
    ) {
      setLocalTags(currentTags);
    }
  }, [memo?.id, prevMemoId, currentTags, localTags, hasManualChanges]);

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
  }, [preloadedTags, localTags, teamMode]);

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
  }, [teamTagsList, localTags, teamMode]);

  // タグに変更があるかチェック（シンプル版）
  const hasTagChanges = useMemo(() => {
    if (!memo || memo.id === undefined || memo.id === 0) return false;

    const currentTagIds = currentTags.map((tag) => tag.id).sort();
    const localTagIds = localTags.map((tag) => tag.id).sort();

    return JSON.stringify(currentTagIds) !== JSON.stringify(localTagIds);
  }, [currentTags, localTags, memo]);

  // 未保存の変更があるかチェック（useMemoで確実に再計算）
  const isNewMemo = !memo || memo.id === 0;
  const hasUnsavedChanges = useMemo(() => {
    return isNewMemo
      ? !!content.trim() || pendingImages.length > 0
      : hasChanges ||
          hasTagChanges ||
          pendingImages.length > 0 ||
          pendingDeletes.length > 0;
  }, [
    isNewMemo,
    content,
    pendingImages.length,
    hasChanges,
    hasTagChanges,
    pendingDeletes.length,
  ]);

  // チーム機能でのURL共有用
  const shareUrl = useMemo(() => {
    if (!teamMode || !memo || memo.id === 0) return null;

    const teamName = extractTeamNameFromUrl();
    if (!teamName) return null;

    return generateTeamShareUrl({
      teamName,
      tab: "memos",
      itemId: memo.id,
    });
  }, [teamMode, memo]);

  // タグの差分を計算して一括更新する関数
  const updateTaggings = useCallback(
    async (memoId: string) => {
      if (!memo || memo.id === undefined || memo.id === 0) {
        return;
      }

      const currentTagIds = currentTags.map((tag) => tag.id);
      const localTagIds = localTags.map((tag) => tag.id);

      // 削除するタグ（currentにあってlocalにない）
      const tagsToRemove = currentTagIds.filter(
        (id) => !localTagIds.includes(id),
      );
      // 追加するタグ（localにあってcurrentにない）
      const tagsToAdd = localTagIds.filter((id) => !currentTagIds.includes(id));

      if (teamMode && teamId) {
        // チームモード：チームタグ付けAPIを使用
        // 削除処理
        for (const tagId of tagsToRemove) {
          try {
            await deleteTeamTaggingByTagMutation.mutateAsync({
              tagId,
              targetType: "memo",
              targetOriginalId: memoId,
            });
          } catch (error: unknown) {
            const errorMessage = (error as Error).message || "";
            if (!errorMessage.includes("not found")) {
              // "not found"以外のエラーは表示
              console.error("チームタグ削除エラー:", error);
            }
          }
        }

        // 追加処理
        for (const tagId of tagsToAdd) {
          try {
            await createTeamTaggingMutation.mutateAsync({
              tagId,
              targetType: "memo",
              targetOriginalId: memoId,
            });
          } catch (error: unknown) {
            const errorMessage = (error as Error).message || "";
            const isDuplicateError =
              errorMessage.includes("already attached") ||
              errorMessage.includes("duplicate");

            if (!isDuplicateError) {
              // 重複以外のエラーは再スロー
              throw error;
            }
          }
        }
      } else {
        // 個人モード：既存の個人タグ付けAPIを使用
        // 削除処理（preloadedTaggingsからタギングIDを見つける）
        for (const tagId of tagsToRemove) {
          const taggingToDelete = preloadedTaggings.find(
            (t) =>
              t.tagId === tagId &&
              t.targetType === "memo" &&
              t.targetOriginalId === memoId,
          );

          if (taggingToDelete) {
            await deleteTaggingMutation.mutateAsync(taggingToDelete.id);
          } else {
          }
        }

        // 追加処理
        for (const tagId of tagsToAdd) {
          // 既に存在するかどうかを再度チェック（リアルタイムデータで）
          const existingTagging = preloadedTaggings.find(
            (t) =>
              t.tagId === tagId &&
              t.targetType === "memo" &&
              t.targetOriginalId === memoId,
          );

          if (!existingTagging) {
            try {
              await createTaggingMutation.mutateAsync({
                tagId,
                targetType: "memo",
                targetOriginalId: String(memoId),
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
                `Failed to create tagging for tag ${tagId} on memo ${memoId}:`,
                error,
              );
              throw error;
            }
          }
        }
      }
    },
    [
      memo,
      currentTags,
      localTags,
      preloadedTaggings,
      teamMode,
      teamId,
      deleteTaggingMutation,
      createTaggingMutation,
      deleteTeamTaggingByTagMutation,
      createTeamTaggingMutation,
    ],
  );

  // 拡張された保存処理（削除済みの場合は実行しない）
  const handleSaveWithTags = useCallback(async () => {
    if (isDeleted) {
      return; // 削除済みの場合は保存しない
    }

    try {
      // 新規作成で画像のみの場合（テキストなし）の特別処理
      const isNewMemo = !memo || memo.id === 0;
      const hasOnlyImages =
        isNewMemo && !content.trim() && pendingImages.length > 0;

      let targetOriginalId: string | null = null;
      let createdMemo: Memo | null = null;

      if (hasOnlyImages) {
        // 画像のみの場合は「無題」で新規作成
        const newMemoData = {
          title: " ", // 最低1文字必要なので半角スペース
          content: "",
        };

        if (teamMode && teamId) {
          // チームモード
          const token = await getToken();

          const url = `${API_URL}/teams/${teamId}/memos`;

          const response = await fetch(url, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...(token && { Authorization: `Bearer ${token}` }),
            },
            body: JSON.stringify(newMemoData),
          });

          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(
              `チームメモの作成に失敗しました: ${response.status} - ${errorText}`,
            );
          }

          const newMemo = (await response.json()) as Memo;
          targetOriginalId = OriginalIdUtils.fromItem(newMemo) || "";
          createdMemo = newMemo;

          // キャッシュ更新
          queryClient.invalidateQueries({
            queryKey: ["team-memos", teamId],
          });
        } else {
          // 個人モード
          const token = await getToken();

          const url = `${API_URL}/memos`;

          const response = await fetch(url, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...(token && { Authorization: `Bearer ${token}` }),
            },
            body: JSON.stringify(newMemoData),
          });

          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(
              `メモの作成に失敗しました: ${response.status} - ${errorText}`,
            );
          }

          const newMemo = (await response.json()) as Memo;
          targetOriginalId = OriginalIdUtils.fromItem(newMemo) || "";
          createdMemo = newMemo;

          // ボード紐付け（選択されているもの）
          const boardsToAdd =
            selectedBoardIds.length > 0
              ? selectedBoardIds
              : initialBoardId
                ? [initialBoardId]
                : [];

          for (const boardId of boardsToAdd) {
            try {
              await addItemToBoard.mutateAsync({
                boardId,
                data: {
                  itemType: "memo",
                  itemId: targetOriginalId,
                },
              });
            } catch (error) {
              const message =
                error instanceof Error ? error.message : String(error);
              if (!message.includes("already exists")) {
                console.error("ボード追加に失敗しました", message);
              }
            }
          }

          // キャッシュ更新
          queryClient.invalidateQueries({ queryKey: ["memos"] });
        }

        if (targetOriginalId) {
          const boardsToAdd =
            selectedBoardIds.length > 0
              ? selectedBoardIds
              : initialBoardId
                ? [initialBoardId]
                : [];

          for (const boardId of boardsToAdd) {
            try {
              await addItemToBoard.mutateAsync({
                boardId,
                data: {
                  itemType: "memo",
                  itemId: targetOriginalId,
                },
              });
            } catch (error) {
              const message =
                error instanceof Error ? error.message : String(error);
              if (!message.includes("already exists")) {
                console.error("[MemoEditor] ボード追加に失敗しました", {
                  boardId,
                  message,
                });
              }
            }
          }
        }
      } else {
        // 通常の保存処理
        await handleSave();

        // 保存後の処理用のoriginalIdを取得
        targetOriginalId =
          memo && memo.id > 0 ? (OriginalIdUtils.fromItem(memo) ?? null) : null;
        if (!targetOriginalId && lastSavedMemoRef.current) {
          targetOriginalId =
            OriginalIdUtils.fromItem(lastSavedMemoRef.current) ?? null;
          createdMemo = lastSavedMemoRef.current;
        }
      }

      // 保存後、タグも更新
      if (memo && memo.id > 0) {
        // 既存メモの場合
        await updateTaggings(targetOriginalId || "");
        setHasManualChanges(false);
      } else if (
        !hasOnlyImages &&
        (localTags.length > 0 || pendingImages.length > 0)
      ) {
        // 新規作成でタグまたは画像がある場合は、少し遅延させて最新のメモリストから取得
        await new Promise((resolve) => setTimeout(resolve, 100));

        // React QueryのキャッシュからmemosQueryを取得して、最新の作成メモを特定
        const memosQuery = queryClient.getQueryData<Memo[]>(["memos"]);

        if (memosQuery && memosQuery.length > 0) {
          // 最新のメモ（作成時刻順で最後）を取得
          const latestMemo = [...memosQuery].sort(
            (a, b) => b.createdAt - a.createdAt,
          )[0];

          if (latestMemo) {
            targetOriginalId = OriginalIdUtils.fromItem(latestMemo) || "";
            if (localTags.length > 0) {
              await updateTaggings(targetOriginalId);
              setHasManualChanges(false);
            }
          }
        } else {
          /**
           * 最新メモが見つからない場合はスキップ
           */
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

        invalidateBoardCaches();

        // 画像のみ保存の場合、作成されたメモを選択してビューモードに切り替え
        if (hasOnlyImages) {
          if (createdMemo) {
            pendingSaveResultRef.current = {
              savedMemo: createdMemo,
              wasEmpty: false,
              isNewMemo: true,
            };
          } else {
            const queryKey =
              teamMode && teamId ? ["team-memos", teamId] : ["memos"];
            await queryClient.invalidateQueries({ queryKey });

            // 少し遅延させて最新のメモリストから取得
            await new Promise((resolve) => setTimeout(resolve, 100));

            const memosQuery = queryClient.getQueryData<Memo[]>(queryKey);
            if (memosQuery && memosQuery.length > 0) {
              // 最新のメモ（作成時刻順で最後）を取得
              const latestMemo = [...memosQuery].sort(
                (a, b) => b.createdAt - a.createdAt,
              )[0];

              if (latestMemo) {
                pendingSaveResultRef.current = {
                  savedMemo: latestMemo,
                  wasEmpty: false,
                  isNewMemo: true,
                };
              }
            } else {
              // クエリ結果が空の場合は追加処理なし
            }
          }
        }
      }

      flushPendingSaveResult();
    } catch (error) {
      console.error("保存に失敗しました:", error);
    }
  }, [
    handleSave,
    memo,
    updateTaggings,
    isDeleted,
    localTags,
    queryClient,
    pendingImages,
    pendingDeletes,
    uploadPendingImages,
    deletePendingAttachments,
    showToast,
    content,
    teamMode,
    teamId,
    getToken,
    onSaveComplete,
    flushPendingSaveResult,
  ]);

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
  }, [boards, teamMode, teamId]);

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

  // ボード選択変更ハンドラー（削除済みの場合は無効）
  const handleBoardSelectorChange = (value: string | string[]) => {
    if (isDeleted) return; // 削除済みの場合は変更不可

    const values = Array.isArray(value) ? value : [value];
    const boardIds = values.filter((v) => v !== "").map((v) => parseInt(v, 10));

    handleBoardChange(boardIds);
  };

  // フォーカス管理（新規作成時に遅延）
  useEffect(() => {
    if (textareaRef.current && !memo) {
      // 新規作成時のみ
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
        }
      }, 300);
    }
  }, [memo]);

  // 蓋の状態を監視してアニメーション状態を管理
  useEffect(() => {
    if (isLidOpen) {
      setIsAnimating(true);
    } else if (isAnimating) {
      // 蓋が閉じた後、300ms待ってからアニメーション状態をリセット
      const timer = setTimeout(() => {
        setIsAnimating(false);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isLidOpen, isAnimating]);

  // Ctrl+S ショートカット（変更がある場合のみ実行）
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        if (
          hasChanges ||
          hasTagChanges ||
          pendingImages.length > 0 ||
          pendingDeletes.length > 0
        ) {
          handleSaveWithTags();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [
    handleSaveWithTags,
    hasChanges,
    hasTagChanges,
    pendingImages,
    pendingDeletes,
  ]);

  // TeamDetailContext経由でモバイルフッターに状態を公開
  const teamDetailContext = teamMode ? useTeamDetail() : null;

  // Contextに最新の状態を常に反映
  useEffect(() => {
    if (teamDetailContext) {
      teamDetailContext.memoEditorHasUnsavedChangesRef.current =
        hasUnsavedChanges;
      teamDetailContext.memoEditorShowConfirmModalRef.current = () => {
        setIsCloseConfirmModalOpen(true);
      };
    }
  }, [hasUnsavedChanges, teamDetailContext]);

  // モバイルフッター戻るボタンイベント（Context経由）
  useEffect(() => {
    const handleMobileBackRequested = () => {
      if (teamMode && teamDetailContext) {
        // Contextから最新の状態を読み取る
        const currentHasUnsavedChanges =
          teamDetailContext.memoEditorHasUnsavedChangesRef.current;
        const showModal =
          teamDetailContext.memoEditorShowConfirmModalRef.current;

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
      "memo-editor-mobile-back-requested",
      handleMobileBackRequested,
    );
    return () => {
      window.removeEventListener(
        "memo-editor-mobile-back-requested",
        handleMobileBackRequested,
      );
    };
  }, [teamMode, teamDetailContext, hasUnsavedChanges, onClose]);

  // ボード名を取得するためのヘルパー関数
  const getBoardName = (boardId: number) => {
    const board = boards.find((b) => b.id === boardId);
    return board?.name || `ボード${boardId}`;
  };

  // 戻るボタンクリックハンドラー（未保存変更チェック）
  const handleCloseClick = useCallback(() => {
    if (hasUnsavedChanges) {
      setIsCloseConfirmModalOpen(true);
    } else {
      onClose();
    }
  }, [hasUnsavedChanges, onClose]);

  // 確認モーダルで「閉じる」を選択
  const handleConfirmClose = useCallback(() => {
    setIsCloseConfirmModalOpen(false);
    onClose();
  }, [onClose]);

  // 削除ボタンのハンドラー（ボード紐づきチェック付き）
  const handleDeleteClick = () => {
    // 重複クリック防止
    if (unifiedOperations?.deleteItem.isPending || isAnimating) {
      return;
    }

    if (isDeleted && onDelete) {
      // 削除済みメモの場合は完全削除（親コンポーネントに委任）
      onDelete();
    } else if (teamMode || (itemBoards && itemBoards.length > 0)) {
      // チームモードまたはボードに紐づいている場合はモーダル表示と同時に蓋を開く
      setIsAnimating(true);
      setShowDeleteModal(true);
    } else {
      // ボードに紐づいていない場合は蓋を開いてから直接削除
      setIsAnimating(true);
      if (memo && memo.id > 0) {
        // ダイレクト削除処理も親（MemoScreen）に委任（200ms遅延削除で統一）

        if (onDeleteAndSelectNext) {
          onDeleteAndSelectNext(memo);
        } else if (onDelete) {
          onDelete();
        }
      }
    }
  };

  // モーダルでの削除確定
  // 統一フック（propsから受け取り）

  const handleConfirmDelete = async () => {
    if (!memo || memo.id === 0) return;
    setShowDeleteModal(false);

    // 削除処理は親（MemoScreen）に委任し、memo-editorでは実行しない

    // 削除コールバックを呼び出し、親側で実際の削除処理を実行してもらう
    if (onDeleteAndSelectNext) {
      onDeleteAndSelectNext(memo);
    } else if (onDelete) {
      onDelete();
    }
  };

  // モーダルキャンセル時の処理
  const handleCancelDelete = () => {
    setShowDeleteModal(false);
    setIsAnimating(false); // 蓋を閉じる
  };

  return (
    <>
      <div
        ref={baseViewerRef}
        data-memo-editor
        className="flex flex-col h-full overflow-x-hidden"
      >
        {/* 固定ヘッダー部分 */}
        <div className="flex-shrink-0 bg-white pl-2 pt-2">
          <div className="flex justify-start items-center">
            {/* ここにheaderActionsの内容を直接配置 */}
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2">
                {/* 閉じるボタン（PCのみ表示、モバイルではフッターに表示） */}
                <button
                  onClick={handleCloseClick}
                  className="hidden md:flex items-center justify-center size-7 rounded-md bg-gray-100 hover:bg-gray-200 text-gray-600 hover:text-gray-800 transition-colors"
                  data-memo-close-button="true"
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
                    {(!memo || memo.id === 0) && (
                      <ContinuousCreateButton
                        storageKey="memo-continuous-create-mode"
                        onModeChange={setContinuousCreateMode}
                        activeColor="bg-gray-500"
                        activeHoverColor="hover:bg-gray-600"
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
                  </>
                )}
                <BoardIconSelector
                  options={boardOptions}
                  value={currentBoardValues}
                  onChange={handleBoardSelectorChange}
                  iconClassName="size-4 text-gray-600"
                  multiple={true}
                  disabled={isDeleted}
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
                {memo && (onDelete || onDeleteAndSelectNext) && (
                  <button
                    onClick={handleDeleteClick}
                    disabled={unifiedOperations?.deleteItem.isPending}
                    className="flex items-center justify-center size-7 rounded-md bg-gray-100 disabled:opacity-50"
                  >
                    <TrashIcon
                      className="size-5"
                      isLidOpen={
                        isLidOpen ||
                        isAnimating ||
                        showDeleteModal ||
                        unifiedOperations?.deleteItem.isPending ||
                        (isDeleted && deletedMemoActions?.showDeleteModal)
                      }
                    />
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2">
                {saveError && (
                  <span className="text-xs text-red-500">{saveError}</span>
                )}
                {isDeleted && deletedMemo && (
                  <span className="text-xs text-red-500 mr-2">
                    削除日時:{" "}
                    {new Date(deletedMemo.deletedAt * 1000).toLocaleDateString(
                      "ja-JP",
                    )}
                  </span>
                )}
                {isDeleted && onRestore && (
                  <button
                    onClick={async () => {
                      if (onRestore) {
                        await onRestore();
                      }
                    }}
                    disabled={false}
                    className="flex items-center justify-center size-7 rounded-md bg-blue-100 text-blue-600 hover:bg-blue-200 ml-2 disabled:opacity-50"
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
                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                      />
                    </svg>
                  </button>
                )}
                {/* 保存ボタンを右側に移動 */}
                {!isDeleted && (
                  <SaveButton
                    onClick={handleSaveWithTags}
                    disabled={(() => {
                      // HTMLタグを除去してテキスト内容のみを抽出
                      const textContent = content
                        .replace(/<[^>]*>/g, "") // HTMLタグを除去
                        .replace(/&nbsp;/g, " ") // &nbsp;を空白に変換
                        .trim();

                      const isContentEmpty = !textContent;

                      console.log("🔍 保存ボタン判定:", {
                        memo: memo,
                        "memo?.id": memo?.id,
                        content: content,
                        textContent: textContent,
                        isContentEmpty: isContentEmpty,
                        "pendingImages.length": pendingImages.length,
                        hasChanges: hasChanges,
                        hasTagChanges: hasTagChanges,
                        "pendingDeletes.length": pendingDeletes.length,
                        isUploading: isUploading,
                      });

                      const disabled =
                        isUploading ||
                        (!hasChanges &&
                          !hasTagChanges &&
                          pendingImages.length === 0 &&
                          pendingDeletes.length === 0) ||
                        (memo !== null &&
                          memo.id > 0 &&
                          isContentEmpty &&
                          pendingImages.length === 0) ||
                        // 新規メモで空の場合は保存不可
                        ((memo === null || memo.id === 0) &&
                          isContentEmpty &&
                          pendingImages.length === 0);

                      console.log("🔍 保存ボタン disabled:", disabled);
                      return disabled;
                    })()}
                    isSaving={
                      isSaving ||
                      isUploading ||
                      createTaggingMutation.isPending ||
                      deleteTaggingMutation.isPending ||
                      createTeamTaggingMutation.isPending ||
                      deleteTeamTaggingByTagMutation.isPending
                    }
                    buttonSize="size-9"
                    iconSize="size-5"
                    className="mr-2"
                  />
                )}
              </div>
            </div>
          </div>
          {/* 作成者・日付をコントロールパネルの下に表示（ツールバー非表示時のみ） */}
          {memo && memo.id !== 0 && !toolbarVisible && (
            <div className="flex justify-end items-center gap-2 mr-2 mt-1 md:mt-0 mb-1">
              <CreatorAvatar
                createdBy={createdBy}
                avatarColor={createdByAvatarColor}
                teamMode={teamMode}
                size="md"
                className=""
              />
              <DateInfo item={memo} isEditing={!isDeleted} size="sm" />
            </div>
          )}

          {/* 書式ツールバー（固定表示・日付の代わりに表示） */}
          {!isDeleted && toolbarVisible && <Toolbar editor={tiptapEditor} />}
        </div>

        {/* スクロール可能なコンテンツ部分 */}
        <div className="flex-1 min-h-0 overflow-y-auto">
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
              <BaseViewer
                item={
                  memo || {
                    id: 0,
                    title: "",
                    content: "",
                    createdAt: Math.floor(Date.now() / 1000),
                    updatedAt: Math.floor(Date.now() / 1000),
                  }
                }
                onClose={onClose}
                error={null}
                isEditing={true}
                createdItemId={null}
                hideDateInfo={true}
                topContent={null}
                compactPadding={true}
                headerActions={null}
              >
                <div className="w-full pr-1">
                  <TiptapEditor
                    content={content}
                    onChange={(newContent) => {
                      const firstLine = newContent.split("\n")[0] || "";
                      handleTitleChange(firstLine);
                      handleContentChange(newContent);
                    }}
                    placeholder={isDeleted ? "削除済みのメモです" : "入力..."}
                    readOnly={isDeleted}
                    className="font-medium"
                    toolbarVisible={toolbarVisible}
                    onEditorReady={setTiptapEditor}
                    onImagePaste={handleFileSelect}
                  />
                </div>

                {/* ボード名・タグ一覧をテキストエリアの下に配置（TaskFormと統一） */}
                <BoardTagDisplay
                  boards={memo && memo.id !== 0 ? displayBoards : []}
                  tags={localTags}
                  spacing="normal"
                  showWhen="has-content"
                  className="mb-2"
                />
              </BaseViewer>

              {/* 画像添付ギャラリー（個人・チーム両対応） */}
              <AttachmentGallery
                attachments={attachments}
                onDelete={handleDeleteAttachment}
                isDeleting={isDeleting}
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
      {baseViewerRef.current && (
        <BoardChangeModal
          isOpen={showBoardChangeModal}
          onClose={handleCancelBoardChange}
          onConfirm={handleConfirmBoardChange}
          boardsToAdd={pendingBoardChanges.boardsToAdd.map(getBoardName)}
          boardsToRemove={pendingBoardChanges.boardsToRemove.map(getBoardName)}
          parentElement={baseViewerRef.current}
        />
      )}

      {/* タグ選択モーダル */}
      <TagSelectionModal
        isOpen={isTagModalOpen}
        onClose={() => setIsTagModalOpen(false)}
        tags={
          teamMode
            ? preloadedTags.length > 0
              ? preloadedTags
              : teamTagsList || []
            : preloadedTags
        }
        selectedTagIds={localTags.map((tag) => tag.id)}
        teamMode={teamMode}
        teamId={teamId}
        onSelectionChange={(tagIds) => {
          const availableTags = teamMode
            ? preloadedTags.length > 0
              ? preloadedTags
              : teamTagsList || []
            : preloadedTags;
          const selectedTags = availableTags.filter((tag) =>
            tagIds.includes(tag.id),
          );

          setLocalTags(selectedTags);
          setHasManualChanges(true);
        }}
        mode="selection"
        multiple={true}
      />
      <BulkDeleteConfirmation
        isOpen={showDeleteModal}
        onClose={handleCancelDelete}
        onConfirm={handleConfirmDelete}
        count={1}
        itemType="memo"
        deleteType="normal"
        isLoading={unifiedOperations?.deleteItem.isPending}
        position="center"
        customTitle={`「${memo?.title || "タイトルなし"}」の削除`}
        customMessage={
          itemBoards.filter(
            (board) => !initialBoardId || board.id !== initialBoardId,
          ).length > 0 ? (
            <div className="text-center">
              <p className="text-sm text-gray-700 mb-3">
                このメモは以下のボードに紐づいています
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

      {/* 削除済みメモの削除確認モーダル */}
      {isDeleted && deletedMemoActions && (
        <BulkDeleteConfirmation
          isOpen={deletedMemoActions.showDeleteModal}
          onClose={deletedMemoActions.hideDeleteConfirmation}
          onConfirm={deletedMemoActions.handlePermanentDelete}
          count={1}
          itemType="memo"
          deleteType="permanent"
          isLoading={deletedMemoActions.isDeleting}
          position="center"
          customTitle={`「${memo?.title || "タイトルなし"}」の完全削除`}
          customMessage={
            itemBoards.filter(
              (board) => !initialBoardId || board.id !== initialBoardId,
            ).length > 0 ? (
              <div className="text-center">
                <p className="text-sm text-gray-700 mb-3">
                  このメモは以下のボードに紐づいています
                </p>
                <div className="mb-3 flex justify-center">
                  <BoardChips
                    boards={itemBoards.filter(
                      (board) => !initialBoardId || board.id !== initialBoardId,
                    )}
                    variant="compact"
                  />
                </div>
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
            ) : (
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
            )
          }
        />
      )}

      {/* 未保存変更確認モーダル */}
      <ConfirmationModal
        isOpen={isCloseConfirmModalOpen}
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

export default memo(MemoEditor);
