import React, { useEffect } from 'react';

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
  // デバッグ用: showの変化を監視
  useEffect(() => {
    console.log(`📦 ButtonContainer[${position}] show変化:`, { 
      show, 
      position,
      timestamp: new Date().toISOString()
    });
  }, [show, position]);

  const positionClass = position === 'bottom-right' 
    ? 'absolute bottom-4 right-6' 
    : 'absolute bottom-4 left-6';
    
  return (
    <div className={`${positionClass} z-20 transition-opacity duration-300 ${
      show ? "opacity-100" : "opacity-0 pointer-events-none"
    }`}>
      {children}
    </div>
  );
}