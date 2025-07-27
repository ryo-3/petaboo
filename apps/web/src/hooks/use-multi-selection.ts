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
  checkedTodoTasks: Set<string | number>;
  setCheckedTodoTasks: React.Dispatch<React.SetStateAction<Set<string | number>>>;
  checkedInProgressTasks: Set<string | number>;
  setCheckedInProgressTasks: React.Dispatch<React.SetStateAction<Set<string | number>>>;
  checkedCompletedTasks: Set<string | number>;
  setCheckedCompletedTasks: React.Dispatch<React.SetStateAction<Set<string | number>>>;
  checkedDeletedTasks: Set<string | number>;
  setCheckedDeletedTasks: React.Dispatch<React.SetStateAction<Set<string | number>>>;
  
  // ヘルパー関数
  getCheckedMemos: (activeMemoTab: string) => Set<string | number>;
  setCheckedMemos: (activeMemoTab: string, value: Set<string | number> | ((prev: Set<string | number>) => Set<string | number>)) => void;
  getCheckedTasks: (activeTaskTab: string) => Set<string | number>;
  setCheckedTasks: (activeTaskTab: string, value: Set<string | number> | ((prev: Set<string | number>) => Set<string | number>)) => void;
  handleMemoSelectionToggle: (memoId: string | number) => void;
  handleTaskSelectionToggle: (taskId: string | number) => void;
}

/**
 * 複数選択状態管理を統合するカスタムフック
 * ボード詳細画面で使用される複数選択関連のロジックを集約
 */
export function useMultiSelection(activeMemoTab: string, activeTaskTab: string = "todo"): UseMultiSelectionReturn {
  // 複数選択状態管理
  const [selectionMode, setSelectionMode] = useState<"select" | "check">("select");
  
  // メモの選択状態をタブ別に分離
  const [checkedNormalMemos, setCheckedNormalMemos] = useState<Set<string | number>>(new Set());
  const [checkedDeletedMemos, setCheckedDeletedMemos] = useState<Set<string | number>>(new Set());
  // タスクの選択状態をタブ別に分離
  const [checkedTodoTasks, setCheckedTodoTasks] = useState<Set<string | number>>(new Set());
  const [checkedInProgressTasks, setCheckedInProgressTasks] = useState<Set<string | number>>(new Set());
  const [checkedCompletedTasks, setCheckedCompletedTasks] = useState<Set<string | number>>(new Set());
  const [checkedDeletedTasks, setCheckedDeletedTasks] = useState<Set<string | number>>(new Set());
  
  // 現在のタブに応じた選択状態を取得
  const getCheckedMemos = useCallback((tab: string) => {
    return tab === "normal" ? checkedNormalMemos : checkedDeletedMemos;
  }, [checkedNormalMemos, checkedDeletedMemos]);
  
  // 現在のタブに応じたタスク選択状態を取得
  const getCheckedTasks = useCallback((tab: string) => {
    switch (tab) {
      case "todo": return checkedTodoTasks;
      case "in_progress": return checkedInProgressTasks;
      case "completed": return checkedCompletedTasks;
      case "deleted": return checkedDeletedTasks;
      default: return checkedTodoTasks;
    }
  }, [checkedTodoTasks, checkedInProgressTasks, checkedCompletedTasks, checkedDeletedTasks]);
  
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
  
  // 現在のタブに応じたタスク選択状態を設定
  const setCheckedTasks = useCallback((tab: string, value: Set<string | number> | ((prev: Set<string | number>) => Set<string | number>)) => {
    let targetSetter;
    switch (tab) {
      case "todo": targetSetter = setCheckedTodoTasks; break;
      case "in_progress": targetSetter = setCheckedInProgressTasks; break;
      case "completed": targetSetter = setCheckedCompletedTasks; break;
      case "deleted": targetSetter = setCheckedDeletedTasks; break;
      default: targetSetter = setCheckedTodoTasks; break;
    }
    
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
  
  // タスクの選択トグル（現在のタブに応じて適切な状態を更新）
  const handleTaskSelectionToggle = useCallback((taskId: string | number) => {
    setCheckedTasks(activeTaskTab, prev => {
      const newSet = new Set(prev);
      if (newSet.has(taskId)) {
        newSet.delete(taskId);
      } else {
        newSet.add(taskId);
      }
      return newSet;
    });
  }, [activeTaskTab, setCheckedTasks]);
  
  // 選択モード切り替え
  const handleSelectionModeChange = useCallback((mode: "select" | "check") => {
    setSelectionMode(mode);
    // checkモードからselectモードに切り替える時、選択状態をクリア
    if (mode === "select") {
      setCheckedNormalMemos(new Set());
      setCheckedDeletedMemos(new Set());
      setCheckedTodoTasks(new Set());
      setCheckedInProgressTasks(new Set());
      setCheckedCompletedTasks(new Set());
      setCheckedDeletedTasks(new Set());
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
    checkedTodoTasks,
    setCheckedTodoTasks,
    checkedInProgressTasks,
    setCheckedInProgressTasks,
    checkedCompletedTasks,
    setCheckedCompletedTasks,
    checkedDeletedTasks,
    setCheckedDeletedTasks,
    
    // ヘルパー関数
    getCheckedMemos,
    setCheckedMemos,
    getCheckedTasks,
    setCheckedTasks,
    handleMemoSelectionToggle,
    handleTaskSelectionToggle,
  };
}