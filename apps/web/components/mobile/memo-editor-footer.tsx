"use client";

import MemoIcon from "@/components/icons/memo-icon";
import CommentIcon from "@/components/icons/comment-icon";
import { ArrowLeft, Image } from "lucide-react";

interface MemoEditorFooterProps {
  onBack: () => void;
  onMemoClick: () => void;
  onCommentClick: () => void;
  onImageClick: () => void;
  activeTab: "memo" | "comment" | "image";
  imageCount?: number;
  commentCount?: number;
}

export default function MemoEditorFooter({
  onBack,
  onMemoClick,
  onCommentClick,
  onImageClick,
  activeTab,
  imageCount = 0,
  commentCount = 0,
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

      {/* 画像ボタン */}
      <button
        onClick={onImageClick}
        className={`relative flex items-center justify-center min-w-0 flex-1 transition-colors rounded-md ${
          activeTab === "image" ? "bg-Green" : ""
        }`}
        aria-label="画像・ファイル"
      >
        <Image
          className={`w-6 h-6 ml-1 ${
            activeTab === "image" ? "text-white" : "text-gray-400"
          }`}
        />
        {imageCount > 0 && (
          <span
            className={`ml-1 text-xs ${
              activeTab === "image" ? "text-white" : "text-gray-400"
            }`}
          >
            {imageCount}
          </span>
        )}
      </button>

      {/* コメントボタン */}
      <button
        onClick={onCommentClick}
        className={`relative flex items-center justify-center min-w-0 flex-1 transition-colors rounded-md ${
          activeTab === "comment" ? "bg-Green" : ""
        }`}
        aria-label="コメント"
      >
        <CommentIcon
          className={`w-6 h-6 ml-1 ${
            activeTab === "comment" ? "text-white" : "text-gray-400"
          }`}
        />
        {commentCount > 0 && (
          <span
            className={`ml-1 text-xs ${
              activeTab === "comment" ? "text-white" : "text-gray-400"
            }`}
          >
            {commentCount}
          </span>
        )}
      </button>
    </div>
  );
}
