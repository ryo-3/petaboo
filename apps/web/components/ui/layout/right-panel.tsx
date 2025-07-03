"use client";

import ClosePanelButton from "@/components/ui/buttons/close-panel-button";

interface RightPanelProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
}

/**
 * 右側詳細表示パネル
 * memo-screen.tsx, task-screen.tsx で共通使用
 * スライドインアニメーション付き
 */
function RightPanel({ isOpen, onClose, children, className }: RightPanelProps) {
  if (!isOpen) return null;

  return (
    <div className={`w-1/2 h-full overflow-y-auto animate-slide-in-right relative ${className || ''}`}>
      {/* 閉じるボタン */}
      <ClosePanelButton onClose={onClose} />
      
      {/* コンテンツエリア */}
      <div className="pl-5 pr-5 pt-2">
        {children}
      </div>
    </div>
  );
}

export default RightPanel;