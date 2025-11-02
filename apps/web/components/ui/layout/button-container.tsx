import React from "react";

interface ButtonContainerProps {
  show: boolean;
  position: "bottom-left" | "bottom-right";
  children: React.ReactNode;
}

/**
 * 削除ボタンや復元ボタンを配置するためのコンテナコンポーネント
 * 位置とアニメーションを統一的に管理
 */
export function ButtonContainer({
  show,
  position,
  children,
}: ButtonContainerProps) {
  const positionClass =
    position === "bottom-right"
      ? "absolute bottom-4 right-6 md:bottom-4 md:right-6"
      : "absolute bottom-20 left-5 md:bottom-4 md:left-5";

  return (
    <div
      className={`${positionClass} z-[5] transition-opacity duration-300 ${
        show ? "opacity-100" : "opacity-0 pointer-events-none"
      }`}
    >
      {children}
    </div>
  );
}
