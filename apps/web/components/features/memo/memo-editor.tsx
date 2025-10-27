"use client";

import BaseViewer from "@/components/shared/base-viewer";
import PhotoButton from "@/components/ui/buttons/photo-button";
import SaveButton from "@/components/ui/buttons/save-button";
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
import { useTeamContext } from "@/contexts/team-context";
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
import UrlPreview from "@/src/components/shared/url-preview";

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
}: MemoEditorProps) {
  const { isTeamMode: teamMode, teamId: teamIdRaw } = useTeamContext();
  const teamId = teamIdRaw ?? undefined; // Hook互換性のため変換

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
  } = useSimpleItemSave<Memo>({
    item: memo,
    itemType: "memo",
    onSaveComplete: useCallback(
      (savedMemo: Memo, wasEmpty: boolean, isNewMemo: boolean) => {
        // 新規メモ作成で連続作成モードが有効な場合
        if (isNewMemo && !wasEmpty && continuousCreateMode) {
          // タグをリセット
          setLocalTags([]);
          setHasManualChanges(false);
          // フォームを手動でリセット
          setTimeout(() => {
            resetForm?.();
          }, 50);
          return; // onSaveCompleteを呼ばずに新規作成状態を維持
        }
        // 通常の保存完了処理
        onSaveComplete?.(savedMemo, wasEmpty, isNewMemo);
      },
      [onSaveComplete, continuousCreateMode],
    ),
    currentBoardIds,
    initialBoardId,
    onDeleteAndSelectNext,
    teamMode,
    teamId,
    boardId: initialBoardId, // チームボードキャッシュ更新用
  });

  const [error] = useState<string | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const queryClient = useQueryClient();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [localTags, setLocalTags] = useState<Tag[]>([]);
  const [prevMemoId, setPrevMemoId] = useState<number | null>(null);
  const [isTagModalOpen, setIsTagModalOpen] = useState(false);

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

  // 手動でタグを変更したかどうかのフラグ
  const [hasManualChanges, setHasManualChanges] = useState(false);

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
    handlePaste,
    handleDeleteAttachment,
    handleDeletePendingImage,
    handleRestoreAttachment,
    uploadPendingImages,
    deletePendingAttachments,
    isDeleting,
    isUploading,
  } = attachmentManager;

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
      // まずメモを保存
      await handleSave();

      // 保存後の処理用のoriginalIdを取得
      let targetOriginalId =
        memo && memo.id > 0 ? OriginalIdUtils.fromItem(memo) : null;

      // 保存後、タグも更新
      if (memo && memo.id > 0) {
        // 既存メモの場合
        await updateTaggings(targetOriginalId || "");
        setHasManualChanges(false);
      } else if (localTags.length > 0 || pendingImages.length > 0) {
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
        await uploadPendingImages();
      }
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

  // ボード名を取得するためのヘルパー関数
  const getBoardName = (boardId: number) => {
    const board = boards.find((b) => b.id === boardId);
    return board?.name || `ボード${boardId}`;
  };

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
        className="flex flex-col h-full"
      >
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
          error={error}
          isEditing={true}
          createdItemId={null}
          hideDateInfo={true}
          topContent={null}
          headerActions={
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2">
                {/* 閉じるボタン（チームモードのみ表示） */}
                {teamMode && (
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
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </button>
                )}
                {saveError && (
                  <span className="text-xs text-red-500">{saveError}</span>
                )}
                {!isDeleted && (
                  <>
                    <SaveButton
                      onClick={handleSaveWithTags}
                      disabled={
                        isUploading ||
                        (!hasChanges &&
                          !hasTagChanges &&
                          pendingImages.length === 0 &&
                          pendingDeletes.length === 0) ||
                        (memo !== null && memo.id > 0 && !content.trim())
                      }
                      isSaving={
                        isSaving ||
                        isUploading ||
                        createTaggingMutation.isPending ||
                        deleteTaggingMutation.isPending ||
                        createTeamTaggingMutation.isPending ||
                        deleteTeamTaggingByTagMutation.isPending
                      }
                      buttonSize="size-7"
                      iconSize="size-4"
                    />
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
                        onFileSelect={handleFileSelect}
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
                    label="メモのURLをコピーして共有"
                  />
                )}
              </div>
              <div className="flex items-center gap-1">
                {isDeleted && deletedMemo && (
                  <span className="text-xs text-red-500 mr-2">
                    削除日時:{" "}
                    {new Date(deletedMemo.deletedAt * 1000).toLocaleDateString(
                      "ja-JP",
                    )}
                  </span>
                )}
                {/* ヘッダー右側にアバター・日付を表示（showDateAtBottom=falseの場合） */}
                {!showDateAtBottom && memo && memo.id !== 0 && (
                  <>
                    <CreatorAvatar
                      createdBy={createdBy}
                      avatarColor={createdByAvatarColor}
                      teamMode={teamMode}
                      size="lg"
                      className="mr-2"
                    />
                    <DateInfo item={memo} isEditing={!isDeleted} />
                  </>
                )}
                {isDeleted && onRestore && (
                  <button
                    onClick={async () => {
                      // シンプルな復元処理：onRestoreコールバックのみ実行
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
                {memo && (onDelete || onDeleteAndSelectNext) && (
                  <button
                    onClick={handleDeleteClick}
                    disabled={unifiedOperations?.deleteItem.isPending}
                    className="flex items-center justify-center size-7 rounded-md bg-gray-100 mr-2 disabled:opacity-50"
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
            </div>
          }
        >
          <textarea
            ref={textareaRef}
            placeholder={isDeleted ? "削除済みのメモです" : "入力..."}
            value={content}
            onChange={
              isDeleted
                ? undefined
                : (e) => {
                    const newContent = e.target.value;
                    const firstLine = newContent.split("\n")[0] || "";

                    handleTitleChange(firstLine);
                    handleContentChange(newContent);
                  }
            }
            onPaste={handlePaste}
            readOnly={isDeleted}
            className={`w-full ${customHeight || "flex-1 min-h-0"} resize-none outline-none leading-relaxed font-medium pr-1 mt-2 ${
              isDeleted
                ? "text-red-500 bg-red-50 cursor-not-allowed"
                : "text-gray-500"
            }`}
          />

          {/* URL自動リンク化プレビュー（URLを含む行のみ表示） */}
          {content && !isDeleted && (
            <UrlPreview text={content} className="mt-2 mb-2 px-1" />
          )}

          {/* ボード名・タグ一覧をテキストエリアの下に配置（TaskFormと統一） */}
          <BoardTagDisplay
            boards={memo && memo.id !== 0 ? displayBoards : []}
            tags={localTags}
            spacing="normal"
            showWhen="has-content"
            className="mb-2"
          />
        </BaseViewer>

        {/* 画像添付ギャラリー */}
        {teamMode && (
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
        )}

        {/* 日付情報とアバターアイコンを右下に配置（showDateAtBottom=trueの場合のみ） */}
        {showDateAtBottom && memo && memo.id !== 0 && (
          <div className="flex justify-end items-center gap-2 mb-3 mr-2 mt-2">
            {/* チーム機能: 作成者アイコン */}
            <CreatorAvatar
              createdBy={createdBy}
              avatarColor={createdByAvatarColor}
              teamMode={teamMode}
              size="lg"
              className=""
            />
            {/* 日付情報 */}
            <DateInfo item={memo} isEditing={!isDeleted} />
          </div>
        )}
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
    </>
  );
}

export default memo(MemoEditor);
