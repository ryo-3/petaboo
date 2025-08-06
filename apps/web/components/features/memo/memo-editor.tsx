"use client";

import BaseViewer from "@/components/shared/base-viewer";
import PhotoButton from "@/components/ui/buttons/photo-button";
import SaveButton from "@/components/ui/buttons/save-button";
import TrashIcon from "@/components/icons/trash-icon";
import BoardIconSelector from "@/components/ui/selectors/board-icon-selector";
import Tooltip from "@/components/ui/base/tooltip";
import BoardChangeModal from "@/components/ui/modals/board-change-modal";
import { SingleDeleteConfirmation } from "@/components/ui/modals/confirmation-modal";
import TagSelector from "@/components/features/tags/tag-selector";
import TagTriggerButton from "@/components/features/tags/tag-trigger-button";
import { TAG_COLORS } from "@/src/constants/colors";
import { useBoards, useItemBoards } from "@/src/hooks/use-boards";
import { useSimpleMemoSave } from "@/src/hooks/use-simple-memo-save";
import { useItemTags, useCreateTagging, useDeleteTagging, useTaggings } from "@/src/hooks/use-taggings";
import type { Memo } from "@/src/types/memo";
import type { Tag, Tagging } from "@/src/types/tag";
import { useEffect, useRef, useState, memo, useMemo, useCallback } from "react";

interface MemoEditorProps {
  memo: Memo | null;
  initialBoardId?: number;
  onClose: () => void;
  onSaveComplete?: (
    savedMemo: Memo,
    wasEmpty: boolean,
    isNewMemo: boolean
  ) => void;
  onDelete?: () => void;
  onDeleteAndSelectNext?: (deletedMemo: Memo) => void;
  isLidOpen?: boolean;
  customHeight?: string;
}

function MemoEditor({ memo, initialBoardId, onClose, onSaveComplete, onDelete, onDeleteAndSelectNext, isLidOpen = false, customHeight }: MemoEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const baseViewerRef = useRef<HTMLDivElement>(null);
  const { data: boards = [] } = useBoards();
  const { data: itemBoards = [] } = useItemBoards('memo', memo?.id);
  
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
  const tagSelectorRef = useRef<HTMLDivElement>(null);
  
  // 現在のメモに紐づいているタグを取得（メモが存在する場合のみ）
  const { tags: currentTags, isLoading: tagsLoading } = useItemTags(
    'memo', 
    memo && memo.id > 0 ? (memo.originalId || memo.id.toString()) : '__no_memo__'
  );
  const { data: currentTaggings = [] } = useTaggings({
    targetType: 'memo',
    targetOriginalId: memo && memo.id > 0 ? (memo.originalId || memo.id.toString()) : '__no_memo__',
  });
  
  // タグ操作用のmutation
  const createTaggingMutation = useCreateTagging();
  const deleteTaggingMutation = useDeleteTagging();

  // localTagsを初期化・同期
  const lastMemoIdRef = useRef<number | undefined>(undefined);
  const [hasManualChanges, setHasManualChanges] = useState(false);
  const [lastSyncedTags, setLastSyncedTags] = useState<string>('');
  const [isInitialized, setIsInitialized] = useState(false);
  
  // メモ切り替え時の初期化処理
  useEffect(() => {
    const memoId = memo?.id;
    const lastMemoId = lastMemoIdRef.current;
    
    
    // メモIDが変更されたか、初回レンダリングの場合のみ実行
    if (memoId !== lastMemoId) {
      lastMemoIdRef.current = memoId;
      setHasManualChanges(false);
      setIsInitialized(false);
      setLastSyncedTags('');
      
      // 新規メモの場合は即座に空配列で初期化
      if (!memo || memo.id === 0) {
        setLocalTags([]);
        setLastSyncedTags('[]');
        setIsInitialized(true);
      } else {
        // 既存メモの場合は一旦空にしてデータ取得を待つ
        setLocalTags([]);
      }
    }
  }, [memo, isInitialized]); // memoオブジェクト全体を監視
  
  // データ取得完了時の初期化処理
  useEffect(() => {
    
    // 新規メモまたはデータロード中は何もしない
    if (!memo || memo.id === 0 || tagsLoading) return;
    
    // まだ初期化されていない場合のみ実行
    if (!isInitialized) {
      // データが確実に取得されるまで少し待機
      const timer = setTimeout(() => {
        const currentTagsStr = JSON.stringify(currentTags.map(t => ({ id: t.id, name: t.name })));
        setLocalTags(currentTags);
        setLastSyncedTags(currentTagsStr);
        setIsInitialized(true);
      }, 50); // 50ms待機してキャッシュの更新を待つ
      
      return () => clearTimeout(timer);
    }
  }, [memo, currentTags, tagsLoading, isInitialized]); // memoオブジェクト全体を監視
  
  // 保存後のタグ同期処理（手動変更がない場合のみ）
  useEffect(() => {
    
    // 新規メモ、データロード中、初期化前、手動変更ありの場合は何もしない
    if (!memo || memo.id === 0 || tagsLoading || !isInitialized || hasManualChanges) return;
    
    const currentTagsStr = JSON.stringify(currentTags.map(t => ({ id: t.id, name: t.name })));
    const tagsActuallyChanged = currentTagsStr !== lastSyncedTags;
    
    if (tagsActuallyChanged) {
      setLocalTags(currentTags);
      setLastSyncedTags(currentTagsStr);
    }
  }, [memo, currentTags, tagsLoading, isInitialized, hasManualChanges, lastSyncedTags]); // memoオブジェクト全体を監視

  // タグに変更があるかチェック
  const hasTagChanges = useMemo(() => {
    if (!memo || memo.id === 0) return false;
    // データがまだロード中の場合は変更なしとして扱う
    if (tagsLoading) return false;
    // 初期化が完了していない場合も変更なしとして扱う
    if (!isInitialized) return false;
    
    const currentTagIds = currentTags.map(tag => tag.id).sort();
    const localTagIds = localTags.map(tag => tag.id).sort();
    
    const hasChanges = JSON.stringify(currentTagIds) !== JSON.stringify(localTagIds);
    
    
    return hasChanges;
  }, [currentTags, localTags, memo, tagsLoading, isInitialized]);

  // タグの差分を計算して一括更新する関数
  const updateTaggings = useCallback(async (memoId: string) => {
    if (!memo || memo.id === 0) return;

    const currentTagIds = currentTags.map(tag => tag.id);
    const localTagIds = localTags.map(tag => tag.id);
    
    // 削除するタグ（currentにあってlocalにない）
    const tagsToRemove = currentTagIds.filter(id => !localTagIds.includes(id));
    // 追加するタグ（localにあってcurrentにない）
    const tagsToAdd = localTagIds.filter(id => !currentTagIds.includes(id));

    // 削除処理
    for (const tagId of tagsToRemove) {
      const taggingToDelete = currentTaggings.find((t: Tagging) => t.tagId === tagId);
      if (taggingToDelete) {
        await deleteTaggingMutation.mutateAsync(taggingToDelete.id);
      }
    }

    // 追加処理
    for (const tagId of tagsToAdd) {
      await createTaggingMutation.mutateAsync({
        tagId,
        targetType: 'memo',
        targetOriginalId: memoId
      });
    }
  }, [memo, currentTags, localTags, currentTaggings, deleteTaggingMutation, createTaggingMutation]);

  // 拡張された保存処理
  const handleSaveWithTags = useCallback(async () => {
    try {
      // まずメモを保存
      await handleSave();
      
      // 保存後、タグも更新（既存メモの場合のみ）
      if (memo && memo.id > 0) {
        await updateTaggings(memo.originalId || memo.id.toString());
        // 手動変更フラグをリセット
        setHasManualChanges(false);
      }
    } catch (error) {
      console.error('保存に失敗しました:', error);
    }
  }, [handleSave, memo, updateTaggings]);

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

  // ボード選択変更ハンドラー
  const handleBoardSelectorChange = (value: string | string[]) => {
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
    if (itemBoards && itemBoards.length > 0) {
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
          headerActions={
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2">
                {saveError && (
                  <span className="text-xs text-red-500">{saveError}</span>
                )}
                <SaveButton
                  onClick={handleSaveWithTags}
                  disabled={!hasChanges && !hasTagChanges}
                  isSaving={isSaving || createTaggingMutation.isPending || deleteTaggingMutation.isPending}
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
                <BoardIconSelector
                  options={boardOptions}
                  value={currentBoardValues}
                  onChange={handleBoardSelectorChange}
                  iconClassName="size-4 text-gray-600"
                  multiple={true}
                />
                <div className="relative" ref={tagSelectorRef}>
                  <TagSelector
                    selectedTags={isInitialized && !tagsLoading ? localTags : []}
                    onTagsChange={(tags) => {
                      setLocalTags(tags);
                      setHasManualChanges(true);
                    }}
                    placeholder="タグ..."
                    className="w-7 h-7"
                    renderTrigger={(onClick) => (
                      <TagTriggerButton onClick={onClick} tags={localTags} />
                    )}
                  />
                </div>
              </div>
              {memo && onDelete && (
                <button
                  onClick={handleDeleteClick}
                  className="flex items-center justify-center size-7 rounded-md bg-gray-100 mr-2"
                >
                  <TrashIcon className="size-5" isLidOpen={isLidOpen || isAnimating || showDeleteModal} />
                </button>
              )}
            </div>
          }
        >
          {/* 現在のメモに紐づいているタグ一覧 */}
          {memo && memo.id !== 0 && localTags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3 mt-2">
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
          )}
          
          <textarea
            ref={textareaRef}
            placeholder="入力..."
            value={content}
            onChange={(e) => {
              const newContent = e.target.value;
              const firstLine = newContent.split("\n")[0] || "";

              handleTitleChange(firstLine);
              handleContentChange(newContent);
            }}
            className={`w-full ${customHeight || 'flex-1'} resize-none outline-none text-gray-500 leading-relaxed font-medium pb-10 mb-2 ${memo && memo.id !== 0 && localTags.length > 0 ? 'mt-0' : 'mt-2'} pr-1`}
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
      {baseViewerRef.current && (
        <SingleDeleteConfirmation
          isOpen={showDeleteModal}
          onClose={handleCancelDelete}
          onConfirm={handleConfirmDelete}
          itemType="memo"
          customMessage={
            <div className="text-gray-700">
              このメモは以下のボードに紐づいています
              <ul className="mt-2 space-y-1">
                {itemBoards.map(board => (
                  <li key={board.id} className="text-gray-700">
                    • {board.name}
                  </li>
                ))}
              </ul>
              <div className="mt-3 text-sm text-gray-600">
                削除すると各ボードの「削除済み」タブに移動します
              </div>
            </div>
          }
          parentElement={baseViewerRef.current}
        />
      )}
    </>
  );
}

export default memo(MemoEditor);
