"use client";

import { useState, useMemo, useEffect } from "react";
import Modal from "./modal";
import type { TeamMember } from "@/src/hooks/use-team-detail";
import { getUserAvatarColor } from "@/src/utils/userUtils";

interface BulkAssigneeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (assigneeId: string | null) => void;
  members: TeamMember[];
  selectedCount: number;
  isLoading?: boolean;
  /** 選択中タスクの現在の担当者（全て同じ場合のみ設定、バラバラの場合はundefined） */
  currentAssigneeId?: string | null;
}

function getDisplayName(member: TeamMember): string {
  return member.displayName || `ユーザー${member.userId.slice(-4)}`;
}

export default function BulkAssigneeModal({
  isOpen,
  onClose,
  onConfirm,
  members,
  selectedCount,
  isLoading = false,
  currentAssigneeId,
}: BulkAssigneeModalProps) {
  // 初期値はcurrentAssigneeIdを使用（undefinedの場合はnull）
  const [selectedAssignee, setSelectedAssignee] = useState<string | null>(
    currentAssigneeId ?? null,
  );

  // モーダルが開いた時に現在の担当者で初期化
  useEffect(() => {
    if (isOpen) {
      setSelectedAssignee(currentAssigneeId ?? null);
    }
  }, [isOpen, currentAssigneeId]);

  const memberOptions = useMemo(() => {
    return members.map((member) => {
      const displayName = getDisplayName(member);
      const avatarColor =
        member.avatarColor || getUserAvatarColor(member.userId);
      const initial = displayName.charAt(0).toUpperCase();

      return {
        userId: member.userId,
        displayName,
        avatarColor,
        initial,
      };
    });
  }, [members]);

  const handleConfirm = () => {
    onConfirm(selectedAssignee);
    // リセットはonConfirm側でモーダルを閉じた後に行われる
  };

  const handleClose = () => {
    // useEffectでisOpen変更時にリセットされるので、ここでは不要
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="担当者を一括設定"
      maxWidth="sm"
    >
      <div className="space-y-4">
        <p className="text-sm text-gray-600">
          {selectedCount}件のタスクに担当者を設定します
        </p>

        {/* 担当者リスト */}
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {/* 未割り当てオプション */}
          <button
            onClick={() => setSelectedAssignee(null)}
            className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-colors ${
              selectedAssignee === null
                ? "border-blue-500 bg-blue-50"
                : "border-gray-200 hover:bg-gray-50"
            }`}
          >
            <span className="flex items-center justify-center rounded-full bg-gray-300 text-white text-xs font-medium size-8">
              ?
            </span>
            <span className="text-sm font-medium text-gray-700">
              未割り当て
            </span>
            {selectedAssignee === null && (
              <svg
                className="w-5 h-5 text-blue-500 ml-auto"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
            )}
          </button>

          {/* メンバーリスト */}
          {memberOptions.map((member) => (
            <button
              key={member.userId}
              onClick={() => setSelectedAssignee(member.userId)}
              className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                selectedAssignee === member.userId
                  ? "border-blue-500 bg-blue-50"
                  : "border-gray-200 hover:bg-gray-50"
              }`}
            >
              <span
                className={`flex items-center justify-center rounded-full text-white text-xs font-medium size-8 ${member.avatarColor}`}
              >
                {member.initial}
              </span>
              <span className="text-sm font-medium text-gray-700">
                {member.displayName}
              </span>
              {selectedAssignee === member.userId && (
                <svg
                  className="w-5 h-5 text-blue-500 ml-auto"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
            </button>
          ))}
        </div>

        {/* アクションボタン */}
        <div className="flex gap-3 pt-2">
          <button
            onClick={handleClose}
            className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            disabled={isLoading}
          >
            キャンセル
          </button>
          <button
            onClick={handleConfirm}
            className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-500 rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isLoading}
          >
            {isLoading ? "処理中..." : "設定する"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
