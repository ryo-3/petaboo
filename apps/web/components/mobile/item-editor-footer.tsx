"use client";

import MobileEditorFooter, {
  type FooterButton,
} from "@/components/mobile/mobile-editor-footer";
import MemoIcon from "@/components/icons/memo-icon";
import TaskIcon from "@/components/icons/task-icon";
import CommentIcon from "@/components/icons/comment-icon";
import { Image } from "lucide-react";

interface ItemEditorFooterProps {
  /** エディタータイプ（メモ or タスク） */
  type: "memo" | "task";
  /** 戻るボタンのハンドラー */
  onBack: () => void;
  /** メイン項目クリックハンドラー */
  onMainClick: () => void;
  /** コメントクリックハンドラー */
  onCommentClick: () => void;
  /** 画像クリックハンドラー */
  onImageClick: () => void;
  /** アクティブタブ */
  activeTab: "memo" | "task" | "comment" | "image";
  /** 画像カウント */
  imageCount?: number;
  /** コメントカウント */
  commentCount?: number;
  /** コメントボタンを非表示にするか */
  hideComment?: boolean;
}

/**
 * メモ・タスクエディター共通フッターコンポーネント
 * typeプロパティでメモ/タスクを切り替え
 */
export default function ItemEditorFooter({
  type,
  onBack,
  onMainClick,
  onCommentClick,
  onImageClick,
  activeTab,
  imageCount = 0,
  commentCount = 0,
  hideComment = false,
}: ItemEditorFooterProps) {
  // メモ/タスクで異なる設定
  const isMemo = type === "memo";
  const MainIcon = isMemo ? MemoIcon : TaskIcon;
  const mainTabValue = isMemo ? "memo" : "task";
  const activeColorClass = isMemo ? "bg-Green" : "bg-DeepBlue";
  const ariaLabel = isMemo ? "メモ" : "タスク";

  const buttons: FooterButton[] = [
    {
      icon: <MainIcon className="w-6 h-6" />,
      onClick: onMainClick,
      isActive: activeTab === mainTabValue,
      activeColorClass,
      inactiveIconColorClass: "text-gray-400",
      activeIconColorClass: "text-white",
      ariaLabel,
    },
    {
      icon: <Image className="w-6 h-6 ml-1" />,
      onClick: onImageClick,
      isActive: activeTab === "image",
      activeColorClass,
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
            activeColorClass,
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
