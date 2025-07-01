"use client";

import CheckIcon from "@/components/icons/check-icon";
import PhotoIcon from "@/components/icons/photo-icon";
import TrashIcon from "@/components/icons/trash-icon";
import DateInfo from "@/components/shared/date-info";
import EditButton from "@/components/ui/buttons/edit-button";
import { useMemoForm } from "@/src/hooks/use-memo-form";
import { useDeleteNote } from "@/src/hooks/use-notes";
import type { Memo } from "@/src/types/memo";
import { useEffect, useRef, useState } from "react";

interface MemoCreatorProps {
  onClose: () => void;
  memo?: Memo | null;
  onExitEdit?: () => void;
}

function MemoCreator({ onClose, memo = null, onExitEdit }: MemoCreatorProps) {
  // 新規作成時は常に編集モード、既存メモの場合は表示モードから開始
  const [isEditing, setIsEditing] = useState(memo === null);
  const titleInputRef = useRef<HTMLTextAreaElement>(null);
  const deleteNote = useDeleteNote();
  const {
    title,
    setTitle,
    content,
    setContent,
    savedSuccessfully,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    isEditMode,
    createdMemoId,
  } = useMemoForm({ memo });

  // 新規作成時のフォーカス遅延
  useEffect(() => {
    if (memo === null && titleInputRef.current) {
      const timer = setTimeout(() => {
        titleInputRef.current?.focus();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleDelete = async () => {
    try {
      // 既存メモの場合はそのIDで削除
      if (memo && memo.id) {
        await deleteNote.mutateAsync(memo.id);
        // ローカルストレージからも削除
        localStorage.removeItem(`memo_draft_${memo.id}`);
      }
      // 新規作成時で自動保存されたメモがある場合はそのIDで削除
      else if (createdMemoId) {
        await deleteNote.mutateAsync(createdMemoId);
        // ローカルストレージからも削除
        localStorage.removeItem(`memo_draft_${createdMemoId}`);
      }

      // 新規作成用のローカルストレージを削除（createdMemoIdがあるかないかに関わらず）
      Object.keys(localStorage).forEach((key) => {
        if (key.startsWith("memo_draft_new_")) {
          try {
            const data = JSON.parse(localStorage.getItem(key) || "{}");
            // このセッションで作成されたメモかどうかを判定（タイトルと内容が一致）
            if (data.title === title && data.content === content) {
              localStorage.removeItem(key);
            }
          } catch (error) {
            console.error("ローカルストレージ解析エラー:", error);
          }
        }
      });

      onClose();
    } catch (error) {
      console.error("削除に失敗しました:", error);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white p-2">
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
          <button
            className="p-2 rounded-full bg-gray-200 text-gray-600 hover:bg-gray-300 hover:text-gray-800 transition-colors"
            title="画像を添付（今後対応予定）"
            onClick={() => {
              // TODO: 画像添付機能の実装
              alert("画像添付機能は今後実装予定です");
            }}
          >
            <PhotoIcon className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-3 ml-auto">
          {/* Removed error display as error is no longer available */}
        </div>
      </div>

      <div className="flex flex-col gap-2 flex-1">
        {memo && <DateInfo item={memo} createdItemId={createdMemoId} />}

        <div className="flex items-center gap-3 mb-2">
          {savedSuccessfully && (
            <CheckIcon className="w-5 h-5 text-green-600 flex-shrink-0" />
          )}
        </div>

        <textarea
          ref={titleInputRef}
          placeholder="メモを入力...&#10;&#10;最初の行がタイトルになります"
          value={content}
          onChange={(e) => {
            setContent(e.target.value);
            // 最初の行をタイトルとして設定
            const firstLine = e.target.value.split("\n")[0] || "";
            setTitle(firstLine);
          }}
          className="w-full h-[calc(100vh-280px)] resize-none outline-none text-gray-500 leading-relaxed font-medium"
        />
      </div>

      <button
        onClick={handleDelete}
        className="
          fixed bottom-6 right-6
          bg-gray-500 hover:bg-gray-600 text-white
          size-10 flex items-center justify-center
          rounded-full shadow-lg transition-colors
        "
      >
        <TrashIcon className="w-5 h-5" />
      </button>
    </div>
  );
}

export default MemoCreator;
