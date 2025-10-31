"use client";

interface MobileFabButtonProps {
  /** メモ or タスク */
  type: "memo" | "task";
  /** チームモード or 個人モード */
  teamMode: boolean;
  /** 表示するか（activeTab !== "deleted" など） */
  show?: boolean;
}

/**
 * モバイル右下の新規追加FABボタン（メモ・タスク共通）
 * メモのシンプルなイベントフローを基準に実装
 */
export default function MobileFabButton({
  type,
  teamMode,
  show = true,
}: MobileFabButtonProps) {
  if (!show) return null;

  // タイプ別の設定
  const config = {
    memo: {
      color: "bg-Green hover:bg-Green/90",
      eventName: teamMode ? "team-memo-create" : "personal-memo-create",
    },
    task: {
      color: "bg-DeepBlue hover:bg-DeepBlue/90",
      eventName: teamMode ? "team-task-create" : "personal-task-create",
    },
  };

  const currentConfig = config[type];

  const handleClick = () => {
    window.dispatchEvent(new CustomEvent(currentConfig.eventName));
  };

  return (
    <button
      onClick={handleClick}
      className={`md:hidden fixed bottom-16 right-2 size-9 ${currentConfig.color} text-white rounded-full shadow-lg flex items-center justify-center z-20 transition-all`}
      aria-label={`新規${type === "memo" ? "メモ" : "タスク"}作成`}
    >
      <svg
        className="size-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        strokeWidth={2.5}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
      </svg>
    </button>
  );
}
