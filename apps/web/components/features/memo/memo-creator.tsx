"use client";

import DateInfo from "@/components/shared/date-info";
import EditButton from "@/components/ui/buttons/edit-button";
import DeleteButton from "@/components/ui/buttons/delete-button";
import PhotoButton from "@/components/ui/buttons/photo-button";
import { useMemoForm } from "@/src/hooks/use-memo-form";
import { useDeleteNote } from "@/src/hooks/use-notes";
import type { Memo } from "@/src/types/memo";
import { useEffect, useRef, useState } from "react";

interface MemoCreatorProps {
  onClose: () => void;
  memo?: Memo | null;
  onExitEdit?: () => void;
  onMemoAdd?: (memo: Memo) => void;
  onMemoUpdate?: (id: number, updates: Partial<Memo>) => void;
  onMemoIdUpdate?: (oldId: number, newId: number) => void;
  onMemoDelete?: (id: number) => void;
  onEditingChange?: (editingData: {
    title: string;
    content: string;
    tempId: string;
    lastEditedAt: number;
    realId?: number | null;
  } | null) => void;
}

function MemoCreator({ onClose, memo = null, onExitEdit, onMemoAdd, onMemoUpdate, onMemoDelete, onEditingChange }: MemoCreatorProps) {
  // 新規作成時は常に編集モード、既存メモの場合は表示モードから開始
  const [isEditing, setIsEditing] = useState(memo === null);
  const titleInputRef = useRef<HTMLTextAreaElement>(null);
  const deleteNote = useDeleteNote();
  const {
    title,
    content,
    saveError,
    handleTitleChange,
    handleContentChange,
  } = useMemoForm({ memo, onMemoAdd, onMemoUpdate });

  // フォーカス管理：新規作成時と編集開始時
  useEffect(() => {
    if (titleInputRef.current) {
      if (memo === null) {
        // 新規作成時のフォーカス遅延
        const timer = setTimeout(() => {
          const textarea = titleInputRef.current;
          if (textarea) {
            textarea.focus();
            textarea.setSelectionRange(textarea.value.length, textarea.value.length);
          }
        }, 300);
        return () => clearTimeout(timer);
      } else if (isEditing) {
        // 編集開始時のフォーカス（文字の最後に）
        const timer = setTimeout(() => {
          const textarea = titleInputRef.current;
          if (textarea) {
            textarea.focus();
            textarea.setSelectionRange(textarea.value.length, textarea.value.length);
          }
        }, 100);
        return () => clearTimeout(timer);
      }
    }
  }, [memo, isEditing]);

  // 編集状態を親に通知（簡略化）
  useEffect(() => {
    if (onEditingChange && memo === null) { // 新規作成時のみ
      if (title.trim() || content.trim()) {
        onEditingChange({
          title,
          content,
          tempId: `new_${Date.now()}`,
          lastEditedAt: Date.now(),
          realId: null
        });
      } else {
        onEditingChange(null);
      }
    }
  }, [title, content, onEditingChange, memo]);

  const handleDelete = async () => {
    try {
      // 既存メモの場合はそのIDで削除
      if (memo && memo.id) {
        await deleteNote.mutateAsync(memo.id);
        onMemoDelete?.(memo.id);
      }

      onClose();
    } catch (error) {
      console.error("削除に失敗しました:", error);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white p-2">
      <DateInfo 
        item={memo || { 
          id: 0, 
          title: '', 
          content: '', 
          createdAt: Math.floor(Date.now() / 1000), 
          updatedAt: Math.floor(Date.now() / 1000) 
        }} 
        createdItemId={null} 
        lastEditedAt={null} 
      />

      <div className="flex justify-start items-center mb-4">
        <div className="flex items-center gap-2">
          {/* 既存メモの場合のみ編集ボタンを表示 */}
          {memo && (
            <EditButton
              isEditing={isEditing}
              onEdit={() => setIsEditing(true)}
              onExitEdit={() => {
                setIsEditing(false);
                if (onExitEdit) onExitEdit();
              }}
            />
          )}

          {/* 写真アイコン（今後の画像添付機能用） */}
          <PhotoButton />
        </div>

        <div className="flex items-center gap-3 ml-auto">
          {/* エラー表示のみ */}
          {saveError && (
            <span className="text-xs text-red-500">{saveError}</span>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-2 flex-1">
        <textarea
          ref={titleInputRef}
          placeholder="入力..."
          value={content}
          onChange={(e) => {
            handleContentChange(e.target.value);
            // 最初の行をタイトルとして設定
            const firstLine = e.target.value.split("\n")[0] || "";
            handleTitleChange(firstLine);
          }}
          className="w-full h-[calc(100vh-280px)] resize-none outline-none text-gray-500 leading-relaxed font-medium"
        />
      </div>

      <DeleteButton
        onDelete={handleDelete}
        className="fixed bottom-6 right-6"
      />
    </div>
  );
}

export default MemoCreator;
