"use client";

import MobileEditorFooter, {
  type FooterButton,
} from "@/components/mobile/mobile-editor-footer";
import TaskIcon from "@/components/icons/task-icon";
import CommentIcon from "@/components/icons/comment-icon";
import { Image } from "lucide-react";

interface TaskEditorFooterProps {
  onBack: () => void;
  onTaskClick: () => void;
  onCommentClick: () => void;
  onImageClick: () => void;
  activeTab: "task" | "comment" | "image";
  imageCount?: number;
  commentCount?: number;
  hideComment?: boolean; // コメントボタンを非表示にするか
}

/**
 * タスクエディター専用フッターコンポーネント
 * MobileEditorFooterを使用して統一的なUIを提供
 */
export default function TaskEditorFooter({
  onBack,
  onTaskClick,
  onCommentClick,
  onImageClick,
  activeTab,
  imageCount = 0,
  commentCount = 0,
  hideComment = false,
}: TaskEditorFooterProps) {
  const buttons: FooterButton[] = [
    {
      icon: <TaskIcon className="w-6 h-6" />,
      onClick: onTaskClick,
      isActive: activeTab === "task",
      activeColorClass: "bg-DeepBlue",
      inactiveIconColorClass: "text-gray-400",
      activeIconColorClass: "text-white",
      ariaLabel: "タスク",
    },
    {
      icon: <Image className="w-6 h-6 ml-1" />,
      onClick: onImageClick,
      isActive: activeTab === "image",
      activeColorClass: "bg-DeepBlue",
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
            activeColorClass: "bg-DeepBlue",
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
