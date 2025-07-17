"use client";

import ClosePanelButton from "@/components/ui/buttons/close-panel-button";
import { useEffect, useState } from "react";

interface RightPanelProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
  disableAnimation?: boolean; // アニメーション無効化オプション
}

/**
 * 右側詳細表示パネル
 * memo-screen.tsx, task-screen.tsx で共通使用
 * スライドインアニメーション付き
 */
function RightPanel({ isOpen, onClose, children, className, disableAnimation = false }: RightPanelProps) {
  const [hasAnimated, setHasAnimated] = useState(false);

  useEffect(() => {
    if (isOpen && !hasAnimated && !disableAnimation) {
      setHasAnimated(true);
    }
  }, [isOpen, hasAnimated, disableAnimation]);

  // パネルが閉じた時にアニメーション状態をリセット
  useEffect(() => {
    if (!isOpen) {
      setHasAnimated(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const shouldAnimate = !disableAnimation && !hasAnimated;

  return (
    <div className={`flex-1 h-full overflow-y-auto relative ${shouldAnimate ? 'animate-slide-in-right' : ''} ${className || ''}`}>
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