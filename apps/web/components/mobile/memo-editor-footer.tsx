"use client";

import MobileEditorFooter, {
  type FooterButton,
} from "@/components/mobile/mobile-editor-footer";
import MemoIcon from "@/components/icons/memo-icon";
import CommentIcon from "@/components/icons/comment-icon";
import { Image } from "lucide-react";

interface MemoEditorFooterProps {
  onBack: () => void;
  onMemoClick: () => void;
  onCommentClick: () => void;
  onImageClick: () => void;
  activeTab: "memo" | "comment" | "image";
  imageCount?: number;
  commentCount?: number;
  hideComment?: boolean; // コメントボタンを非表示にするか
}

/**
 * メモエディター専用フッターコンポーネント
 * MobileEditorFooterを使用して統一的なUIを提供
 */
export default function MemoEditorFooter({
  onBack,
  onMemoClick,
  onCommentClick,
  onImageClick,
  activeTab,
  imageCount = 0,
  commentCount = 0,
  hideComment = false,
}: MemoEditorFooterProps) {
  const buttons: FooterButton[] = [
    {
      icon: <MemoIcon className="w-6 h-6" />,
      onClick: onMemoClick,
      isActive: activeTab === "memo",
      activeColorClass: "bg-Green",
      inactiveIconColorClass: "text-gray-400",
      activeIconColorClass: "text-white",
      ariaLabel: "メモ",
    },
    {
      icon: <Image className="w-6 h-6 ml-1" />,
      onClick: onImageClick,
      isActive: activeTab === "image",
      activeColorClass: "bg-Green",
      inactiveIconColorClass: "text-gray-400",
      activeIconColorClass: "text-white",
      ariaLabel: "画像・ファイル",
      count: imageCount,
    },
    // コメントボタンは hideComment が false の場合のみ表示
    ...(!hideComment
      ? [
          {
            icon: <CommentIcon className="w-6 h-6 ml-1" />,
            onClick: onCommentClick,
            isActive: activeTab === "comment",
            activeColorClass: "bg-Green",
            inactiveIconColorClass: "text-gray-400",
            activeIconColorClass: "text-white",
            ariaLabel: "コメント",
            count: commentCount,
          } as FooterButton,
        ]
      : []),
  ];

  return <MobileEditorFooter onBack={onBack} buttons={buttons} />;
}
