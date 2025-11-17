"use client";

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
 * スライドイン・スライドアウトアニメーション付き
 */
function RightPanel({
  isOpen,
  onClose,
  children,
  className,
  disableAnimation = false,
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
      className={`w-full md:flex-1 h-full flex flex-col relative ${shouldAnimateIn ? "md:animate-slide-in-right" : ""} ${shouldAnimateOut ? "md:animate-slide-out-right" : ""} ${className || ""}`}
    >
      {/* コンテンツエリア */}
      <div
        className={`pr-2 flex-1 flex flex-col hover-scrollbar ${shouldAnimateIn ? "overflow-hidden" : "overflow-y-auto"}`}
      >
        {children}
      </div>
    </div>
  );
}

export default RightPanel;
