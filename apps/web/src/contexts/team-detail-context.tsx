"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";

interface TeamDetailContextType {
  selectedMemoId: number | null;
  setSelectedMemoId: (id: number | null) => void;
  selectedTaskId: number | null;
  setSelectedTaskId: (id: number | null) => void;
}

const TeamDetailContext = createContext<TeamDetailContextType | undefined>(
  undefined,
);

export function TeamDetailProvider({ children }: { children: ReactNode }) {
  const [selectedMemoId, setSelectedMemoId] = useState<number | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);

  return (
    <TeamDetailContext.Provider
      value={{
        selectedMemoId,
        setSelectedMemoId,
        selectedTaskId,
        setSelectedTaskId,
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
