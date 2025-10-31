"use client";

import MobileEditorFooter, {
  type FooterButton,
} from "@/components/mobile/mobile-editor-footer";
import MemoIcon from "@/components/icons/memo-icon";
import TaskIcon from "@/components/icons/task-icon";
import CommentIcon from "@/components/icons/comment-icon";
import { Image } from "lucide-react";

// メモ・タスクエディター用のプロパティ
interface EditorFooterProps {
  type: "memo" | "task";
  onBack: () => void;
  onMainClick: () => void;
  onCommentClick: () => void;
  onImageClick: () => void;
  activeTab: "memo" | "task" | "comment" | "image";
  imageCount?: number;
  commentCount?: number;
  hideComment?: boolean;
}

// ボード詳細用のプロパティ
interface BoardFooterProps {
  type: "board";
  onBack: () => void;
  onMemoClick: () => void;
  onTaskClick: () => void;
  onCommentClick: () => void;
  activeSection: "memos" | "tasks" | "comments";
  commentCount?: number;
}

// 型安全な条件付きプロパティ
type ItemEditorFooterProps = EditorFooterProps | BoardFooterProps;

/**
 * メモ・タスクエディター・ボード詳細共通フッターコンポーネント
 * typeプロパティでメモ/タスク/ボードを切り替え
 */
export default function ItemEditorFooter(props: ItemEditorFooterProps) {
  const { type, onBack, onCommentClick } = props;

  let buttons: FooterButton[];

  if (type === "board") {
    // ボード詳細用のボタン構成: メモ | タスク | コメント
    const { onMemoClick, onTaskClick, activeSection, commentCount = 0 } = props;

    buttons = [
      {
        icon: <MemoIcon className="w-6 h-6" />,
        onClick: onMemoClick,
        isActive: activeSection === "memos",
        activeColorClass: "bg-Green",
        inactiveIconColorClass: "text-gray-400",
        activeIconColorClass: "text-white",
        ariaLabel: "メモ",
      },
      {
        icon: <TaskIcon className="w-6 h-6" />,
        onClick: onTaskClick,
        isActive: activeSection === "tasks",
        activeColorClass: "bg-DeepBlue",
        inactiveIconColorClass: "text-gray-400",
        activeIconColorClass: "text-white",
        ariaLabel: "タスク",
      },
      {
        icon: <CommentIcon className="w-6 h-6 ml-1" />,
        onClick: onCommentClick,
        isActive: activeSection === "comments",
        activeColorClass: "bg-gray-500",
        inactiveIconColorClass: "text-gray-400",
        activeIconColorClass: "text-white",
        ariaLabel: "コメント",
        count: commentCount,
      },
    ];
  } else {
    // メモ・タスクエディター用のボタン構成: メモ/タスク | 画像 | コメント
    const {
      onMainClick,
      onImageClick,
      activeTab,
      imageCount = 0,
      commentCount = 0,
      hideComment = false,
    } = props;

    const isMemo = type === "memo";
    const MainIcon = isMemo ? MemoIcon : TaskIcon;
    const mainTabValue = isMemo ? "memo" : "task";
    const activeColorClass = isMemo ? "bg-Green" : "bg-DeepBlue";
    const ariaLabel = isMemo ? "メモ" : "タスク";

    buttons = [
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
  }

  return <MobileEditorFooter onBack={onBack} buttons={buttons} />;
}
