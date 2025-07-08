"use client";

import { createContext, useContext, useState, ReactNode } from 'react';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

interface ToastContextType {
  toasts: Toast[];
  showToast: (message: string, type: ToastType, duration?: number) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = (message: string, type: ToastType, duration?: number) => {
    const id = Math.random().toString(36).substr(2, 9);
    const newToast: Toast = { id, message, type, duration };
    
    // console.log('🍞 Toast作成:', { id, message, type, duration, willAutoRemove: !!(duration && duration > 0) });
    
    setToasts(prev => [...prev, newToast]);
    
    // Auto remove after duration (only if duration is specified and > 0)
    if (duration && duration > 0) {
      // console.log(`⏰ Toast自動削除タイマー設定: ${duration}ms後に削除 (ID: ${id})`);
      setTimeout(() => {
        // console.log(`🗑️ Toast自動削除実行 (ID: ${id})`);
        removeToast(id);
      }, duration);
    } else {
      // console.log(`🔒 Toast手動削除のみ (ID: ${id})`);
    }
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  return (
    <ToastContext.Provider value={{ toasts, showToast, removeToast }}>
      {children}
    </ToastContext.Provider>
  );
}

export const useToast = () => {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};