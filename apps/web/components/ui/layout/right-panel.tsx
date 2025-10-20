"use client";

import ClosePanelButton from "@/components/ui/buttons/close-panel-button";
import { useEffect, useState } from "react";

interface RightPanelProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
  disableAnimation?: boolean; // アニメーション無効化オプション
  compactPadding?: boolean; // パディングを小さくするオプション
}

/**
 * 右側詳細表示パネル
 * memo-screen.tsx, task-screen.tsx で共通使用
 * スライドイン・スライドアウトアニメーション付き
 */
function RightPanel({
  isOpen,
  onClose,
  children,
  className,
  disableAnimation = false,
  compactPadding = false,
}: RightPanelProps) {
  const [hasAnimated, setHasAnimated] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [shouldRender, setShouldRender] = useState(isOpen);

  // 開くアニメーション
  useEffect(() => {
    if (isOpen && !hasAnimated && !disableAnimation) {
      setShouldRender(true);
      // アニメーション開始後、350ms後にスクロールを有効化
      const timer = setTimeout(() => {
        setHasAnimated(true);
      }, 350);
      return () => clearTimeout(timer);
    } else if (isOpen && disableAnimation) {
      setShouldRender(true);
      setHasAnimated(true);
    }
  }, [isOpen, hasAnimated, disableAnimation]);

  // 閉じるアニメーション
  useEffect(() => {
    if (!isOpen && shouldRender) {
      if (!disableAnimation) {
        setIsClosing(true);
        // アニメーション完了後にDOMから削除
        const timer = setTimeout(() => {
          setShouldRender(false);
          setIsClosing(false);
          setHasAnimated(false);
        }, 300); // アニメーション時間
        return () => clearTimeout(timer);
      } else {
        setShouldRender(false);
        setHasAnimated(false);
      }
    }
  }, [isOpen, shouldRender, disableAnimation]);

  if (!shouldRender) return null;

  const shouldAnimateIn = !disableAnimation && !hasAnimated && !isClosing;
  const shouldAnimateOut = !disableAnimation && isClosing;

  return (
    <div
      className={`flex-1 h-full flex flex-col relative ${shouldAnimateIn ? "animate-slide-in-right" : ""} ${shouldAnimateOut ? "animate-slide-out-right" : ""} ${className || ""}`}
    >
      {/* 閉じるボタン */}
      <ClosePanelButton onClose={onClose} />

      {/* コンテンツエリア */}
      <div
        className={`${compactPadding ? "pl-1" : "pl-5"} pr-2 flex-1 flex flex-col hover-scrollbar ${shouldAnimateIn ? "overflow-hidden" : "overflow-y-auto"}`}
      >
        {children}
      </div>
    </div>
  );
}

export default RightPanel;
