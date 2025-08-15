"use client";

import BaseViewer from "@/components/shared/base-viewer";
import PhotoButton from "@/components/ui/buttons/photo-button";
import SaveButton from "@/components/ui/buttons/save-button";
import TrashIcon from "@/components/icons/trash-icon";
import BoardIconSelector from "@/components/ui/selectors/board-icon-selector";
import Tooltip from "@/components/ui/base/tooltip";
import BoardChangeModal from "@/components/ui/modals/board-change-modal";
import { BulkDeleteConfirmation } from "@/components/ui/modals/confirmation-modal";
import TagTriggerButton from "@/components/features/tags/tag-trigger-button";
import TagSelectionModal from "@/components/ui/modals/tag-selection-modal";
import { TAG_COLORS } from "@/src/constants/colors";
import { useSimpleMemoSave } from "@/src/hooks/use-simple-memo-save";
import { useCreateTagging, useDeleteTagging } from "@/src/hooks/use-taggings";
import { useDeletedMemoActions } from "./use-deleted-memo-actions";
import { useQueryClient } from "@tanstack/react-query";
import BoardChips from "@/components/ui/chips/board-chips";
import DateInfo from "@/components/shared/date-info";
import type { Memo, DeletedMemo } from "@/src/types/memo";
import type { Tag, Tagging } from "@/src/types/tag";
import type { Board } from "@/src/types/board";
import { useEffect, useRef, useState, memo, useMemo, useCallback } from "react";

interface MemoEditorProps {
  memo: Memo | DeletedMemo | null;
  initialBoardId?: number;
  onClose: () => void;
  onSaveComplete?: (
    savedMemo: Memo,
    wasEmpty: boolean,
    isNewMemo: boolean
  ) => void;
  onDelete?: () => void;
  onDeleteAndSelectNext?: (deletedMemo: Memo | DeletedMemo) => void;
  onRestore?: () => void;  // 削除済み復元用
  isLidOpen?: boolean;
  customHeight?: string;
  
  // 全データ事前取得（ちらつき解消）
  preloadedTags?: Tag[];
  preloadedBoards?: Board[];
  preloadedTaggings?: Tagging[];
  preloadedBoardItems?: Array<{
    boardId: number;
    boardName: string;
    itemType: 'memo' | 'task';
    itemId: string;
    originalId: string;
    addedAt: number;
  }>;
}

function MemoEditor({ 
  memo, 
  initialBoardId, 
  onClose, 
  onSaveComplete, 
  onDelete, 
  onDeleteAndSelectNext,
  onRestore,
  isLidOpen = false, 
  customHeight,
  preloadedTags = [],
  preloadedBoards = [],
  preloadedTaggings = [],
  preloadedBoardItems = []
}: MemoEditorProps) {
  // ログを一度だけ出力（useEffectで管理）
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const baseViewerRef = useRef<HTMLDivElement>(null);
  
  // 削除済みメモかどうかを判定
  const isDeleted = memo ? 'deletedAt' in memo : false;
  const deletedMemo = isDeleted ? (memo as DeletedMemo) : null;
  
  // 事前取得されたデータを使用（APIコール不要）
  const boards = preloadedBoards;
  
  // このメモに実際に紐づいているボードのみを抽出
  const itemBoards = useMemo(() => {
    if (!memo || memo.id === undefined || memo.id === 0) return [];
    
    const originalId = memo.originalId || memo.id.toString();
    
    // このメモに紐づいているボードアイテムを抽出
    const memoBoardItems = preloadedBoardItems.filter(
      item => item.itemType === 'memo' && item.originalId === originalId
    );
    
    // ボードアイテムからボード情報を取得
    const boards = memoBoardItems
      .map(item => preloadedBoards.find(board => board.id === item.boardId))
      .filter((board): board is NonNullable<typeof board> => board !== undefined);
    
    return boards;
  }, [memo, preloadedBoardItems, preloadedBoards]);
  
  const currentBoardIds = memo && memo.id !== 0 
    ? itemBoards.map(board => board.id)
    : (initialBoardId ? [initialBoardId] : []);

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
  } = useSimpleMemoSave({
    memo,
    onSaveComplete,
    currentBoardIds,
    initialBoardId,
    onDeleteAndSelectNext,
  });

  const [error] = useState<string | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [localTags, setLocalTags] = useState<Tag[]>([]);
  const [prevMemoId, setPrevMemoId] = useState<number | null>(null);
  const [isTagModalOpen, setIsTagModalOpen] = useState(false);
  
  // 事前取得されたデータからメモのタグを抽出（シンプル）
  const currentTags = useMemo(() => {
    if (!memo || memo.id === undefined || memo.id === 0) return [];
    const originalId = memo.originalId || memo.id.toString();
    
    const memoTaggings = preloadedTaggings.filter(
      t => t.targetType === 'memo' && t.targetOriginalId === originalId
    );
    
    const tags = memoTaggings.map(t => t.tag).filter(Boolean) as Tag[];
    
    return tags;
  }, [memo, preloadedTaggings]);
  
  // タグ操作用のmutation（既存API使用）
  const createTaggingMutation = useCreateTagging();
  const deleteTaggingMutation = useDeleteTagging();
  const queryClient = useQueryClient();

  // 削除済みメモの操作用（React Hooks違反を避けるため常に呼び出し、nullを許可）
  const deletedMemoActions = useDeletedMemoActions({
    memo: isDeleted ? deletedMemo : null,
    onClose,
    onDeleteAndSelectNext,
    onRestoreAndSelectNext: onDeleteAndSelectNext,
    onAnimationChange: setIsAnimating,
  });

  // タグ初期化（メモが変わった時のみ実行）
  useEffect(() => {
    const currentMemoId = memo?.id || 0;
    
    // メモが変わった場合のみ即座に更新
    if (currentMemoId !== prevMemoId) {
      setLocalTags(currentTags);
      setPrevMemoId(currentMemoId);
    }
  }, [memo?.id, currentTags, prevMemoId]);
  
  const [, setHasManualChanges] = useState(false);

  // タグに変更があるかチェック（シンプル版）
  const hasTagChanges = useMemo(() => {
    if (!memo || memo.id === undefined || memo.id === 0) return false;
    
    const currentTagIds = currentTags.map(tag => tag.id).sort();
    const localTagIds = localTags.map(tag => tag.id).sort();
    
    return JSON.stringify(currentTagIds) !== JSON.stringify(localTagIds);
  }, [currentTags, localTags, memo]);

  // タグの差分を計算して一括更新する関数
  const updateTaggings = useCallback(async (memoId: string) => {
    if (!memo || memo.id === undefined || memo.id === 0) {
      return;
    }

    const currentTagIds = currentTags.map(tag => tag.id);
    const localTagIds = localTags.map(tag => tag.id);
    
    // 削除するタグ（currentにあってlocalにない）
    const tagsToRemove = currentTagIds.filter(id => !localTagIds.includes(id));
    // 追加するタグ（localにあってcurrentにない）
    const tagsToAdd = localTagIds.filter(id => !currentTagIds.includes(id));

    // 削除処理（preloadedTaggingsからタギングIDを見つける）
    for (const tagId of tagsToRemove) {
      const taggingToDelete = preloadedTaggings.find((t) => t.tagId === tagId);
      if (taggingToDelete) {
        await deleteTaggingMutation.mutateAsync(taggingToDelete.id);
      }
    }

    // 追加処理
    for (const tagId of tagsToAdd) {
      // 既に存在するかどうかを再度チェック（リアルタイムデータで）
      const existingTagging = preloadedTaggings.find(
        t => t.tagId === tagId && t.targetType === 'memo' && t.targetOriginalId === memoId
      );
      
      if (!existingTagging) {
        try {
          await createTaggingMutation.mutateAsync({
            tagId,
            targetType: 'memo',
            targetOriginalId: memoId
          });
        } catch (error: unknown) {
          // 400エラー（重複）は無視し、他のエラーは再スロー
          const errorMessage = (error as Error).message || '';
          
          const isDuplicateError = (
            errorMessage.includes('HTTP error 400') && 
            errorMessage.includes('Tag already attached to this item')
          ) || (
            errorMessage.includes('400') && 
            errorMessage.includes('already attached')
          );
          
          if (isDuplicateError) {
            continue;
          }
          console.error(`Failed to create tagging for tag ${tagId} on memo ${memoId}:`, error);
          throw error;
        }
      }
    }
  }, [memo, currentTags, localTags, preloadedTaggings, deleteTaggingMutation, createTaggingMutation]);

  // 拡張された保存処理（削除済みの場合は実行しない）
  const handleSaveWithTags = useCallback(async () => {
    if (isDeleted) return; // 削除済みの場合は保存しない
    
    try {
      // まずメモを保存
      await handleSave();
      
      // 保存後、タグも更新
      // onSaveCompleteで最新のメモを取得できるが、同期の問題があるため
      // 既存メモの場合は現在のmemo、新規作成の場合は少し待ってから処理
      if (memo && memo.id > 0) {
        // 既存メモの場合
        await updateTaggings(memo.originalId || memo.id.toString());
        setHasManualChanges(false);
      } else if (localTags.length > 0) {
        // 新規作成でタグがある場合は、少し遅延させて最新のメモリストから取得
        setTimeout(async () => {
          try {
            // React QueryのキャッシュからmemosQueryを取得して、最新の作成メモを特定
            const memosQuery = queryClient.getQueryData<Memo[]>(['memos']);
            
            if (memosQuery && memosQuery.length > 0) {
              // 最新のメモ（作成時刻順で最後）を取得
              const latestMemo = [...memosQuery].sort((a, b) => b.createdAt - a.createdAt)[0];
              
              if (latestMemo) {
                const targetId = latestMemo.originalId || latestMemo.id.toString();
                await updateTaggings(targetId);
                setHasManualChanges(false);
              }
            }
          } catch (error) {
            console.error('❌ 新規メモのタグ保存に失敗しました:', error);
          }
        }, 100); // 100ms遅延
      }
    } catch (error) {
      console.error('❌ 保存に失敗しました:', error);
    }
  }, [handleSave, memo, updateTaggings, isDeleted, localTags, queryClient]);

  // BoardIconSelector用のボードオプション
  const boardOptions = useMemo(() => {
    const options = [
      { value: "", label: "なし" }
    ];
    
    boards.forEach(board => {
      options.push({
        value: board.id.toString(),
        label: board.name
      });
    });
    
    return options;
  }, [boards]);

  // 現在選択されているボードのvalue（複数選択対応）
  const currentBoardValues = selectedBoardIds.map(id => id.toString());
  
  // 表示用のボード（現在の選択状態を反映、initialBoardIdは除外）
  const displayBoards = useMemo(() => {
    // 選択中のボードIDから、実際のボード情報を取得
    const selectedBoards = selectedBoardIds
      .map(id => preloadedBoards.find(board => board.id === id))
      .filter((board): board is NonNullable<typeof board> => board !== undefined)
      // initialBoardIdが指定されている場合（ボード詳細から呼ばれた場合）は、そのボードを除外
      .filter(board => !initialBoardId || board.id !== initialBoardId);
    
    return selectedBoards;
  }, [selectedBoardIds, preloadedBoards, initialBoardId]);

  // ボード選択変更ハンドラー（削除済みの場合は無効）
  const handleBoardSelectorChange = (value: string | string[]) => {
    if (isDeleted) return; // 削除済みの場合は変更不可
    
    const values = Array.isArray(value) ? value : [value];
    const boardIds = values
      .filter(v => v !== "")
      .map(v => parseInt(v, 10));
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
        if (hasChanges || hasTagChanges) {
          handleSaveWithTags();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleSaveWithTags, hasChanges, hasTagChanges]);


  // ボード名を取得するためのヘルパー関数
  const getBoardName = (boardId: number) => {
    const board = boards.find(b => b.id === boardId);
    return board?.name || `ボード${boardId}`;
  };

  // 削除ボタンのハンドラー（ボード紐づきチェック付き）
  const handleDeleteClick = () => {
    if (isDeleted && deletedMemoActions) {
      // 削除済みメモの場合は完全削除（蓋を開く）
      setIsAnimating(true);
      deletedMemoActions.showDeleteConfirmation();
    } else if (itemBoards && itemBoards.length > 0) {
      // ボードに紐づいている場合はモーダル表示と同時に蓋を開く
      setIsAnimating(true);
      setShowDeleteModal(true);
    } else {
      // ボードに紐づいていない場合は蓋を開いてから直接削除
      setIsAnimating(true);
      setTimeout(() => {
        onDelete?.();
      }, 200);
    }
  };

  // モーダルでの削除確定
  const handleConfirmDelete = () => {
    setShowDeleteModal(false);
    onDelete?.();
  };

  // モーダルキャンセル時の処理
  const handleCancelDelete = () => {
    setShowDeleteModal(false);
    setIsAnimating(false); // 蓋を閉じる
  };

  return (
    <>
      <div ref={baseViewerRef} data-memo-editor className="flex flex-col h-full">
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
                {saveError && (
                  <span className="text-xs text-red-500">{saveError}</span>
                )}
                {!isDeleted && (
                  <>
                    <SaveButton
                      onClick={handleSaveWithTags}
                      disabled={!hasChanges && !hasTagChanges}
                      isSaving={isSaving || createTaggingMutation.isPending || deleteTaggingMutation.isPending}
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
                  onClick={isDeleted ? undefined : () => setIsTagModalOpen(true)} 
                  tags={localTags} 
                  disabled={isDeleted} 
                />
              </div>
              <div className="flex items-center gap-1">
                {isDeleted && deletedMemo && (
                  <span className="text-xs text-red-500 mr-2">
                    削除日時: {new Date(deletedMemo.deletedAt * 1000).toLocaleDateString('ja-JP')}
                  </span>
                )}
                {memo && memo.id !== 0 && (
                  <div className="text-[13px] text-gray-400 mr-2">
                    <DateInfo
                      item={memo}
                      isEditing={!isDeleted}
                    />
                  </div>
                )}
                {isDeleted && deletedMemoActions && (
                  <button
                    onClick={deletedMemoActions.handleRestore}
                    disabled={deletedMemoActions.isRestoring}
                    className="flex items-center justify-center size-7 rounded-md bg-blue-100 text-blue-600 hover:bg-blue-200 ml-2 disabled:opacity-50"
                  >
                    <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  </button>
                )}
                {memo && onDelete && (
                  <button
                    onClick={handleDeleteClick}
                    className="flex items-center justify-center size-7 rounded-md bg-gray-100 mr-2"
                  >
                    <TrashIcon className="size-5" isLidOpen={isLidOpen || isAnimating || showDeleteModal || (isDeleted && deletedMemoActions?.showDeleteModal)} />
                  </button>
                )}
              </div>
            </div>
          }
        >
          {/* ボード名・タグ一覧をテキストエリアの上に配置（常に固定高さでちらつき防止） */}
          {memo && memo.id !== 0 && (
            <div className="mb-1 mt-2 min-h-[28px]">
              <div className="flex flex-wrap gap-2">
                {/* ボード名（選択中の状態を表示） */}
                <BoardChips boards={displayBoards} variant="compact" />
                {/* タグ */}
                {localTags.map((tag) => (
                  <div
                    key={tag.id}
                    className="inline-flex items-center px-2 py-1 rounded-md text-xs overflow-hidden"
                    style={{ 
                      backgroundColor: TAG_COLORS.background, 
                      color: TAG_COLORS.text
                    }}
                  >
                    <span>{tag.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          <textarea
            ref={textareaRef}
            placeholder={isDeleted ? "削除済みのメモです" : "入力..."}
            value={content}
            onChange={isDeleted ? undefined : (e) => {
              const newContent = e.target.value;
              const firstLine = newContent.split("\n")[0] || "";

              handleTitleChange(firstLine);
              handleContentChange(newContent);
            }}
            readOnly={isDeleted}
            className={`w-full ${customHeight || 'flex-1'} resize-none outline-none leading-relaxed font-medium pb-10 mb-2 pr-1 ${
              isDeleted 
                ? 'text-red-500 bg-red-50 cursor-not-allowed' 
                : 'text-gray-500'
            }`}
          />
        </BaseViewer>
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
        tags={preloadedTags}
        selectedTagIds={localTags.map(tag => tag.id)}
        onSelectionChange={(tagIds) => {
          const selectedTags = preloadedTags.filter(tag => tagIds.includes(tag.id));
          setLocalTags(selectedTags);
          setHasManualChanges(true);
        }}
        mode="selection"
        multiple={true}
        title="タグ選択"
      />
      <BulkDeleteConfirmation
        isOpen={showDeleteModal}
        onClose={handleCancelDelete}
        onConfirm={handleConfirmDelete}
        count={1}
        itemType="memo"
        deleteType="normal"
        isLoading={false}
        position="center"
        customTitle={`「${memo?.title || 'タイトルなし'}」の削除`}
        customMessage={
          itemBoards.filter(board => !initialBoardId || board.id !== initialBoardId).length > 0 ? (
            <div className="text-center">
              <p className="text-sm text-gray-700 mb-3">
                このメモは以下のボードに紐づいています
              </p>
              <div className="mb-3 flex justify-center">
                <BoardChips boards={itemBoards.filter(board => !initialBoardId || board.id !== initialBoardId)} variant="compact" />
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
          customTitle={`「${memo?.title || 'タイトルなし'}」の完全削除`}
          customMessage={
            itemBoards.filter(board => !initialBoardId || board.id !== initialBoardId).length > 0 ? (
              <div className="text-center">
                <p className="text-sm text-gray-700 mb-3">
                  このメモは以下のボードに紐づいています
                </p>
                <div className="mb-3 flex justify-center">
                  <BoardChips boards={itemBoards.filter(board => !initialBoardId || board.id !== initialBoardId)} variant="compact" />
                </div>
                <div className="mt-3 p-3 bg-red-50 rounded-md">
                  <p className="text-sm text-red-800 font-medium">この操作は取り消せません</p>
                  <p className="text-xs text-red-700 mt-1">データは永久に失われます</p>
                  <p className="text-xs text-red-700 mt-1">ボードからも完全に削除されます</p>
                </div>
              </div>
            ) : (
              <div className="text-center">
                <div className="mt-3 p-3 bg-red-50 rounded-md">
                  <p className="text-sm text-red-800 font-medium">この操作は取り消せません</p>
                  <p className="text-xs text-red-700 mt-1">データは永久に失われます</p>
                  <p className="text-xs text-red-700 mt-1">ボードからも完全に削除されます</p>
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
