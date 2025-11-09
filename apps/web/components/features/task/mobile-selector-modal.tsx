"use client";

import { useEffect } from "react";
import { X } from "lucide-react";
import AssigneeSelector from "./assignee-selector";
import BoardCategorySelector from "@/components/features/board-categories/board-category-selector";
import { DatePickerSimple } from "@/components/ui/date-picker-simple";
import type { BoardCategory } from "@/src/types/board-categories";
import type { TeamMember } from "@/src/hooks/use-team-detail";

interface MobileSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;

  // 担当者
  teamMode: boolean;
  formAssigneeId: string | null | undefined;
  handleAssigneeChange?: (value: string | null) => void;
  teamMembers: TeamMember[];

  // ボードカテゴリー
  boardCategoryId: number | null;
  setBoardCategoryId: (value: number | null) => void;
  categories: BoardCategory[];
  initialBoardId: number;

  // 期限
  dueDate: string;
  setDueDate: (value: string) => void;

  // 共通
  isDeleted: boolean;
}

export default function MobileSelectorModal({
  isOpen,
  onClose,
  teamMode,
  formAssigneeId,
  handleAssigneeChange,
  teamMembers,
  boardCategoryId,
  setBoardCategoryId,
  categories,
  initialBoardId,
  dueDate,
  setDueDate,
  isDeleted,
}: MobileSelectorModalProps) {
  // Escキーで閉じる
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center justify-center"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-t-2xl md:rounded-2xl w-full md:max-w-md p-4 max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ヘッダー */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">詳細設定</h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X size={24} className="text-gray-600" />
          </button>
        </div>

        {/* 担当者（teamMode時のみ） */}
        {teamMode && handleAssigneeChange && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              担当者
            </label>
            <AssigneeSelector
              members={teamMembers}
              value={formAssigneeId ?? null}
              onChange={handleAssigneeChange}
              disabled={isDeleted}
              width="100%"
              compact
              hideLabel
            />
          </div>
        )}

        {/* ボードカテゴリー: ボード詳細でのみ表示 */}
        {initialBoardId && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              ボードカテゴリー
            </label>
            <BoardCategorySelector
              value={boardCategoryId}
              onChange={isDeleted ? () => {} : setBoardCategoryId}
              categories={categories}
              boardId={initialBoardId}
              disabled={isDeleted}
              allowCreate={true}
            />
          </div>
        )}

        {/* 期限 */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            期限
          </label>
          <DatePickerSimple
            value={dueDate}
            onChange={isDeleted ? () => {} : setDueDate}
            disabled={isDeleted}
            placeholder="期限を選択"
          />
        </div>

        {/* 閉じるボタン */}
        <button
          onClick={onClose}
          className="w-full py-3 bg-DeepBlue text-white rounded-lg font-medium hover:opacity-90 transition-opacity"
        >
          閉じる
        </button>
      </div>
    </div>
  );
}
