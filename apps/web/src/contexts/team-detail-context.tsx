"use client";

import React, {
  createContext,
  useContext,
  useState,
  ReactNode,
  useRef,
} from "react";
import { useSearchParams } from "next/navigation";

export interface TeamDetailContextType {
  selectedMemoId: number | null;
  setSelectedMemoId: (id: number | null) => void;
  selectedTaskId: number | null;
  setSelectedTaskId: (id: number | null) => void;
  // メモ・タスクの新規作成状態
  isCreatingMemo: boolean;
  setIsCreatingMemo: (isCreating: boolean) => void;
  isCreatingTask: boolean;
  setIsCreatingTask: (isCreating: boolean) => void;
  // メモエディターの未保存変更状態とモーダル表示関数
  memoEditorHasUnsavedChangesRef: React.MutableRefObject<boolean>;
  memoEditorShowConfirmModalRef: React.MutableRefObject<(() => void) | null>;
  // タスクエディターの未保存変更状態とモーダル表示関数
  taskEditorHasUnsavedChangesRef: React.MutableRefObject<boolean>;
  taskEditorShowConfirmModalRef: React.MutableRefObject<(() => void) | null>;
  // モバイルフッター用の画像数とコメント数（メモ用）
  imageCount: number;
  commentCount: number;
  setImageCount: (count: number) => void;
  setCommentCount: (count: number) => void;
  // モバイルフッター用の画像数とコメント数（タスク用）
  taskImageCount: number;
  taskCommentCount: number;
  setTaskImageCount: (count: number) => void;
  setTaskCommentCount: (count: number) => void;
  // アクティブタブ（ヘッダー表示切り替え用）
  activeTab:
    | "overview"
    | "memos"
    | "tasks"
    | "boards"
    | "board"
    | "team-list"
    | "team-settings"
    | "search";
  setActiveTab: (
    tab:
      | "overview"
      | "memos"
      | "tasks"
      | "boards"
      | "board"
      | "team-list"
      | "team-settings"
      | "search",
  ) => void;
}

const TeamDetailContext = createContext<TeamDetailContextType | undefined>(
  undefined,
);

export function TeamDetailProvider({ children }: { children: ReactNode }) {
  const searchParams = useSearchParams();

  // URLから初期タブを取得する関数
  const getInitialTab = (): TeamDetailContextType["activeTab"] => {
    const tab = searchParams.get("tab");
    if (
      tab === "memos" ||
      tab === "tasks" ||
      tab === "boards" ||
      tab === "board" ||
      tab === "team-list" ||
      tab === "team-settings" ||
      tab === "search"
    ) {
      return tab;
    }
    return "overview";
  };

  const [selectedMemoId, setSelectedMemoId] = useState<number | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [isCreatingMemo, setIsCreatingMemo] = useState(false);
  const [isCreatingTask, setIsCreatingTask] = useState(false);
  const [imageCount, setImageCount] = useState(0);
  const [commentCount, setCommentCount] = useState(0);
  const [taskImageCount, setTaskImageCount] = useState(0);
  const [taskCommentCount, setTaskCommentCount] = useState(0);
  const [activeTab, setActiveTab] = useState<
    | "overview"
    | "memos"
    | "tasks"
    | "boards"
    | "board"
    | "team-list"
    | "team-settings"
    | "search"
  >(getInitialTab());
  const memoEditorHasUnsavedChangesRef = useRef(false);
  const memoEditorShowConfirmModalRef = useRef<(() => void) | null>(null);
  const taskEditorHasUnsavedChangesRef = useRef(false);
  const taskEditorShowConfirmModalRef = useRef<(() => void) | null>(null);

  return (
    <TeamDetailContext.Provider
      value={{
        selectedMemoId,
        setSelectedMemoId,
        selectedTaskId,
        setSelectedTaskId,
        isCreatingMemo,
        setIsCreatingMemo,
        isCreatingTask,
        setIsCreatingTask,
        memoEditorHasUnsavedChangesRef,
        memoEditorShowConfirmModalRef,
        taskEditorHasUnsavedChangesRef,
        taskEditorShowConfirmModalRef,
        imageCount,
        commentCount,
        setImageCount,
        setCommentCount,
        taskImageCount,
        taskCommentCount,
        setTaskImageCount,
        setTaskCommentCount,
        activeTab,
        setActiveTab,
      }}
    >
      {children}
    </TeamDetailContext.Provider>
  );
}

export function useTeamDetail() {
  const context = useContext(TeamDetailContext);
  if (context === undefined) {
    throw new Error("useTeamDetail must be used within a TeamDetailProvider");
  }
  return context;
}

// Provider外でも安全に使用できるフック（チーム外ではnullを返す）
export function useTeamDetailSafe() {
  return useContext(TeamDetailContext);
}
