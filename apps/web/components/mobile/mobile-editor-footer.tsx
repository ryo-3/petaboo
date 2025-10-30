"use client";

import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";

export interface FooterButton {
  /** ボタンアイコン */
  icon: ReactNode;
  /** クリックハンドラー */
  onClick: () => void;
  /** アクティブ状態（背景色表示） */
  isActive: boolean;
  /** アクティブ時の背景色クラス */
  activeColorClass: string;
  /** 非アクティブ時のアイコン色クラス */
  inactiveIconColorClass: string;
  /** アクティブ時のアイコン色クラス（通常は text-white） */
  activeIconColorClass?: string;
  /** aria-label（アクセシビリティ） */
  ariaLabel: string;
  /** カウント表示（オプション） */
  count?: number;
}

interface MobileEditorFooterProps {
  /** 戻るボタンのハンドラー */
  onBack: () => void;
  /** フッターボタンの配列 */
  buttons: FooterButton[];
}

/**
 * モバイルエディター用共通フッターコンポーネント
 * メモ・タスク・ボードなど、各種エディターで使用可能
 */
export default function MobileEditorFooter({
  onBack,
  buttons,
}: MobileEditorFooterProps) {
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

      {/* 動的ボタン */}
      {buttons.map((button, index) => (
        <button
          key={index}
          onClick={button.onClick}
          className={`flex items-center justify-center min-w-0 flex-1 transition-colors rounded-md ${
            button.isActive ? button.activeColorClass : ""
          }`}
          aria-label={button.ariaLabel}
        >
          <div
            className={`flex items-center ${
              button.isActive
                ? button.activeIconColorClass || "text-white"
                : button.inactiveIconColorClass
            }`}
          >
            {button.icon}
            {button.count !== undefined && button.count > 0 && (
              <span className="ml-1 text-xs">{button.count}</span>
            )}
          </div>
        </button>
      ))}
    </div>
  );
}
