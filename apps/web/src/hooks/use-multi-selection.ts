import { useState, useCallback } from 'react';

interface UseMultiSelectionReturn {
  // 選択モード
  selectionMode: "select" | "check";
  setSelectionMode: (mode: "select" | "check") => void;
  handleSelectionModeChange: (mode: "select" | "check") => void;
  
  // メモの選択状態
  checkedNormalMemos: Set<string | number>;
  setCheckedNormalMemos: React.Dispatch<React.SetStateAction<Set<string | number>>>;
  checkedDeletedMemos: Set<string | number>;
  setCheckedDeletedMemos: React.Dispatch<React.SetStateAction<Set<string | number>>>;
  
  // タスクの選択状態
  checkedTasks: Set<string | number>;
  setCheckedTasks: React.Dispatch<React.SetStateAction<Set<string | number>>>;
  
  // ヘルパー関数
  getCheckedMemos: (activeMemoTab: string) => Set<string | number>;
  setCheckedMemos: (activeMemoTab: string, value: Set<string | number> | ((prev: Set<string | number>) => Set<string | number>)) => void;
  handleMemoSelectionToggle: (memoId: string | number) => void;
  handleTaskSelectionToggle: (taskId: string | number) => void;
}

/**
 * 複数選択状態管理を統合するカスタムフック
 * ボード詳細画面で使用される複数選択関連のロジックを集約
 */
export function useMultiSelection(activeMemoTab: string): UseMultiSelectionReturn {
  // 複数選択状態管理
  const [selectionMode, setSelectionMode] = useState<"select" | "check">("select");
  
  // メモの選択状態をタブ別に分離
  const [checkedNormalMemos, setCheckedNormalMemos] = useState<Set<string | number>>(new Set());
  const [checkedDeletedMemos, setCheckedDeletedMemos] = useState<Set<string | number>>(new Set());
  const [checkedTasks, setCheckedTasks] = useState<Set<string | number>>(new Set());
  
  // 現在のタブに応じた選択状態を取得
  const getCheckedMemos = useCallback((tab: string) => {
    return tab === "normal" ? checkedNormalMemos : checkedDeletedMemos;
  }, [checkedNormalMemos, checkedDeletedMemos]);
  
  // 現在のタブに応じた選択状態を設定
  const setCheckedMemos = useCallback((tab: string, value: Set<string | number> | ((prev: Set<string | number>) => Set<string | number>)) => {
    const targetSetter = tab === "normal" ? setCheckedNormalMemos : setCheckedDeletedMemos;
    if (typeof value === 'function') {
      targetSetter(prev => {
        const result = value(prev);
        return result;
      });
    } else {
      targetSetter(value);
    }
  }, []);
  
  // メモの選択トグル
  const handleMemoSelectionToggle = useCallback((memoId: string | number) => {
    setCheckedMemos(activeMemoTab, prev => {
      const newSet = new Set(prev);
      if (newSet.has(memoId)) {
        newSet.delete(memoId);
      } else {
        newSet.add(memoId);
      }
      return newSet;
    });
  }, [activeMemoTab, setCheckedMemos]);
  
  // タスクの選択トグル
  const handleTaskSelectionToggle = useCallback((taskId: string | number) => {
    setCheckedTasks(prev => {
      const newSet = new Set(prev);
      if (newSet.has(taskId)) {
        newSet.delete(taskId);
      } else {
        newSet.add(taskId);
      }
      return newSet;
    });
  }, []);
  
  // 選択モード切り替え
  const handleSelectionModeChange = useCallback((mode: "select" | "check") => {
    setSelectionMode(mode);
    // checkモードからselectモードに切り替える時、選択状態をクリア
    if (mode === "select") {
      setCheckedNormalMemos(new Set());
      setCheckedDeletedMemos(new Set());
      setCheckedTasks(new Set());
    }
  }, []);
  
  return {
    // 選択モード
    selectionMode,
    setSelectionMode,
    handleSelectionModeChange,
    
    // メモの選択状態
    checkedNormalMemos,
    setCheckedNormalMemos,
    checkedDeletedMemos,
    setCheckedDeletedMemos,
    
    // タスクの選択状態
    checkedTasks,
    setCheckedTasks,
    
    // ヘルパー関数
    getCheckedMemos,
    setCheckedMemos,
    handleMemoSelectionToggle,
    handleTaskSelectionToggle,
  };
}