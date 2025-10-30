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
}

const TeamDetailContext = createContext<TeamDetailContextType | undefined>(
  undefined,
);

export function TeamDetailProvider({ children }: { children: ReactNode }) {
  const [selectedMemoId, setSelectedMemoId] = useState<number | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
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
