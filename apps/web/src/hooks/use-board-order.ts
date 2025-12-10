import { useState, useEffect, useCallback } from "react";
import type { Board, BoardWithStats } from "@/src/types/board";

/**
 * ボードの並び順をlocalStorageで管理するフック
 * 個人/チームモードで別々に保存
 */
export function useBoardOrder(teamId?: number | null) {
  const storageKey = teamId
    ? `board-order-team-${teamId}`
    : "board-order-personal";

  const [order, setOrder] = useState<number[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // 初期ロード
  useEffect(() => {
    if (typeof window === "undefined") return;

    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        setOrder(JSON.parse(saved));
      } catch {
        setOrder([]);
      }
    }
    setIsLoaded(true);
  }, [storageKey]);

  // 順序を保存
  const saveOrder = useCallback(
    (newOrder: number[]) => {
      setOrder(newOrder);
      if (typeof window !== "undefined") {
        localStorage.setItem(storageKey, JSON.stringify(newOrder));
      }
    },
    [storageKey],
  );

  // ボードをソート
  const sortBoards = useCallback(
    <T extends Board | BoardWithStats>(boards: T[] | undefined): T[] => {
      if (!boards || !isLoaded) return boards || [];
      if (order.length === 0) return boards;

      return [...boards].sort((a, b) => {
        const aIndex = order.indexOf(a.id);
        const bIndex = order.indexOf(b.id);

        // 順序にないボードは末尾に
        if (aIndex === -1 && bIndex === -1) return 0;
        if (aIndex === -1) return 1;
        if (bIndex === -1) return -1;

        return aIndex - bIndex;
      });
    },
    [order, isLoaded],
  );

  // ドラッグ&ドロップでの並び替え
  const handleReorder = useCallback(
    (activeId: number, overId: number, boards: (Board | BoardWithStats)[]) => {
      const oldIndex = boards.findIndex((b) => b.id === activeId);
      const newIndex = boards.findIndex((b) => b.id === overId);

      if (oldIndex === -1 || newIndex === -1) return;

      const newBoards = [...boards];
      const [removed] = newBoards.splice(oldIndex, 1);
      if (removed) {
        newBoards.splice(newIndex, 0, removed);
      }

      const newOrder = newBoards.map((b) => b.id);
      saveOrder(newOrder);
    },
    [saveOrder],
  );

  return {
    order,
    isLoaded,
    sortBoards,
    handleReorder,
    saveOrder,
  };
}
