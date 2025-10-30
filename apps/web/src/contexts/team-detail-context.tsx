"use client";

import React, {
  createContext,
  useContext,
  useState,
  ReactNode,
  useRef,
} from "react";

interface TeamDetailContextType {
  selectedMemoId: number | null;
  setSelectedMemoId: (id: number | null) => void;
  selectedTaskId: number | null;
  setSelectedTaskId: (id: number | null) => void;
  // メモエディターの未保存変更状態とモーダル表示関数
  memoEditorHasUnsavedChangesRef: React.MutableRefObject<boolean>;
  memoEditorShowConfirmModalRef: React.MutableRefObject<(() => void) | null>;
  // モバイルフッター用の画像数とコメント数
  imageCount: number;
  commentCount: number;
  setImageCount: (count: number) => void;
  setCommentCount: (count: number) => void;
}

const TeamDetailContext = createContext<TeamDetailContextType | undefined>(
  undefined,
);

export function TeamDetailProvider({ children }: { children: ReactNode }) {
  const [selectedMemoId, setSelectedMemoId] = useState<number | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [imageCount, setImageCount] = useState(0);
  const [commentCount, setCommentCount] = useState(0);
  const memoEditorHasUnsavedChangesRef = useRef(false);
  const memoEditorShowConfirmModalRef = useRef<(() => void) | null>(null);

  return (
    <TeamDetailContext.Provider
      value={{
        selectedMemoId,
        setSelectedMemoId,
        selectedTaskId,
        setSelectedTaskId,
        memoEditorHasUnsavedChangesRef,
        memoEditorShowConfirmModalRef,
        imageCount,
        commentCount,
        setImageCount,
        setCommentCount,
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
