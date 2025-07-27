import React from 'react';

interface ButtonContainerProps {
  show: boolean;
  position: 'bottom-left' | 'bottom-right';
  children: React.ReactNode;
}

/**
 * 削除ボタンや復元ボタンを配置するためのコンテナコンポーネント
 * 位置とアニメーションを統一的に管理
 */
export function ButtonContainer({ show, position, children }: ButtonContainerProps) {
  const positionClass = position === 'bottom-right' 
    ? 'absolute bottom-4 right-6' 
    : 'absolute bottom-4 left-0';
    
  return (
    <div className={`${positionClass} z-20 transition-opacity duration-300 ${
      show ? "opacity-100" : "opacity-0 pointer-events-none"
    }`}>
      {children}
    </div>
  );
}