"use client";

import BaseViewer from "@/components/shared/base-viewer";
import PhotoButton from "@/components/ui/buttons/photo-button";
import SaveButton from "@/components/ui/buttons/save-button";
import TrashIcon from "@/components/icons/trash-icon";
import BoardIconSelector from "@/components/ui/selectors/board-icon-selector";
import Tooltip from "@/components/ui/base/tooltip";
import BoardChangeModal from "@/components/ui/modals/board-change-modal";
import { SingleDeleteConfirmation } from "@/components/ui/modals/confirmation-modal";
import { useBoards, useItemBoards } from "@/src/hooks/use-boards";
import { useSimpleMemoSave } from "@/src/hooks/use-simple-memo-save";
import type { Memo } from "@/src/types/memo";
import { useEffect, useRef, useState, memo, useMemo } from "react";

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
    currentBoardIds: memo && memo.id !== 0 
      ? itemBoards.map(board => board.id)
      : (initialBoardId ? [initialBoardId] : []),
    initialBoardId,
    onDeleteAndSelectNext,
  });

  const [error] = useState<string | null>(null);
  const [isTrashHovered, setIsTrashHovered] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

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
        // アニメーション完了時にホバー状態もリセット
        setIsTrashHovered(false);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isLidOpen, isAnimating]);

  // Ctrl+S ショートカット（変更がある場合のみ実行）
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        if (hasChanges) {
          handleSave();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleSave, hasChanges]);

  // ボード名を取得するためのヘルパー関数
  const getBoardName = (boardId: number) => {
    const board = boards.find(b => b.id === boardId);
    return board?.name || `ボード${boardId}`;
  };

  // 削除ボタンのハンドラー（ボード紐づきチェック付き）
  const handleDeleteClick = () => {
    if (itemBoards && itemBoards.length > 0) {
      // ボードに紐づいている場合はモーダル表示
      setShowDeleteModal(true);
    } else {
      // ボードに紐づいていない場合は直接削除
      onDelete?.();
    }
  };

  // モーダルでの削除確定
  const handleConfirmDelete = () => {
    setShowDeleteModal(false);
    onDelete?.();
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
            <div className="flex items-center gap-2">
              {saveError && (
                <span className="text-xs text-red-500">{saveError}</span>
              )}
              <SaveButton
                onClick={handleSave}
                disabled={!hasChanges}
                isSaving={isSaving}
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
              {memo && onDelete && (
                  <button
                    onClick={handleDeleteClick}
                    onMouseEnter={() => setIsTrashHovered(true)}
                    onMouseLeave={() => setIsTrashHovered(false)}
                    className={`flex items-center justify-center size-7 rounded-md transition-colors duration-200 ${
                      isAnimating ? 'bg-gray-200' : isTrashHovered ? 'bg-gray-200' : 'bg-gray-100'
                    }`}
                  >
                    <TrashIcon className="size-5" isLidOpen={isLidOpen} />
                  </button>
              )}
            </div>
          }
        >
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
            className={`w-full ${customHeight || 'flex-1'} resize-none outline-none text-gray-500 leading-relaxed font-medium pb-10 mb-2 mt-2 pr-1`}
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
          onClose={() => setShowDeleteModal(false)}
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
