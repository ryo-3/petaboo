"use client";

import MemoIcon from "@/components/icons/memo-icon";
import CommentIcon from "@/components/icons/comment-icon";
import { ArrowLeft } from "lucide-react";

interface MemoEditorFooterProps {
  onBack: () => void;
  onMemoClick: () => void;
  onCommentClick: () => void;
  activeTab: "memo" | "comment";
}

export default function MemoEditorFooter({
  onBack,
  onMemoClick,
  onCommentClick,
  activeTab,
}: MemoEditorFooterProps) {
  return (
    <div className="flex items-center justify-around h-full px-2">
      {/* 戻るボタン */}
      <button
        onClick={onBack}
        className="flex items-center justify-center min-w-0 flex-1"
        aria-label="一覧に戻る"
      >
        <ArrowLeft className="w-6 h-6 text-gray-600" />
      </button>

      {/* メモボタン */}
      <button
        onClick={onMemoClick}
        className={`flex items-center justify-center min-w-0 flex-1 transition-colors rounded-md ${
          activeTab === "memo" ? "bg-Green" : ""
        }`}
        aria-label="メモ"
      >
        <MemoIcon
          className={`w-6 h-6 ${
            activeTab === "memo" ? "text-white" : "text-gray-400"
          }`}
        />
      </button>

      {/* コメントボタン */}
      <button
        onClick={onCommentClick}
        className={`flex items-center justify-center min-w-0 flex-1 transition-colors rounded-md ${
          activeTab === "comment" ? "bg-Green" : ""
        }`}
        aria-label="コメント"
      >
        <CommentIcon
          className={`w-6 h-6 ${
            activeTab === "comment" ? "text-white" : "text-gray-400"
          }`}
        />
      </button>
    </div>
  );
}
