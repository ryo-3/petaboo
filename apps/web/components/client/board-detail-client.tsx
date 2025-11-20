"use client";

import BoardDetailScreenLegacy from "@/components/screens/board-detail-screen";
import BoardDetailScreenUnified from "@/components/screens/board-detail-screen-3panel";
import { useRouter } from "next/navigation";
import { useBoardWithItems } from "@/src/hooks/use-boards";
import { useState, useEffect } from "react";
import { Memo, DeletedMemo } from "@/src/types/memo";
import { Task, DeletedTask } from "@/src/types/task";

interface BoardDetailClientProps {
  boardId: number;
  initialBoardName?: string;
  initialBoardDescription?: string | null;
  teamMode?: boolean;
  teamId?: number | null;
}

const USE_UNIFIED_BOARD_DETAIL = false;

export default function BoardDetailClient({
  boardId,
  initialBoardName,
  initialBoardDescription,
  teamMode: _teamMode = false,
  teamId = null,
}: BoardDetailClientProps) {
  const router = useRouter();
  const { data: boardWithItems } = useBoardWithItems(
    boardId,
    false,
    teamId?.toString() || null,
  );

  const [selectedMemo, setSelectedMemo] = useState<Memo | DeletedMemo | null>(
    null,
  );
  const [selectedTask, setSelectedTask] = useState<Task | DeletedTask | null>(
    null,
  );
  const [selectedMemoId, setSelectedMemoId] = useState<number | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);

  // データ再フェッチ後に選択状態を復元
  useEffect(() => {
    if (boardWithItems?.items && selectedMemoId && !selectedMemo) {
      const memo = boardWithItems.items.find(
        (item) =>
          item.itemType === "memo" && item.content.id === selectedMemoId,
      );
      if (memo) {
        setSelectedMemo(memo.content as Memo | DeletedMemo);
      }
    }
  }, [boardWithItems?.items, selectedMemoId, selectedMemo]);

  useEffect(() => {
    if (boardWithItems?.items && selectedTaskId && !selectedTask) {
      const task = boardWithItems.items.find(
        (item) =>
          item.itemType === "task" && item.content.id === selectedTaskId,
      );
      if (task) {
        setSelectedTask(task.content as Task | DeletedTask);
      }
    }
  }, [boardWithItems?.items, selectedTaskId, selectedTask]);

  const BoardComponent = USE_UNIFIED_BOARD_DETAIL
    ? BoardDetailScreenUnified
    : BoardDetailScreenLegacy;

  return (
    <BoardComponent
      boardId={boardId}
      onBack={() => router.push("/")}
      onSelectMemo={(memo) => {
        setSelectedMemo(memo);
        setSelectedMemoId(memo?.id || null);
        setSelectedTask(null); // タスク選択をクリア
        setSelectedTaskId(null);
      }}
      onSelectTask={(task) => {
        setSelectedTask(task);
        setSelectedTaskId(task?.id || null);
        setSelectedMemo(null); // メモ選択をクリア
        setSelectedMemoId(null);
      }}
      initialBoardName={initialBoardName}
      initialBoardDescription={initialBoardDescription}
      boardCompleted={boardWithItems?.completed || false}
      isDeleted={false}
      showBoardHeader={false}
      selectedMemo={selectedMemo}
      selectedTask={selectedTask}
    />
  );
}
