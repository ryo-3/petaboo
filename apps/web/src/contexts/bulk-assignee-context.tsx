"use client";

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  ReactNode,
} from "react";
import { useParams } from "next/navigation";
import { useTeamContext } from "./team-context";
import { useUpdateTask } from "@/src/hooks/use-tasks";
import { useTeamDetail } from "@/src/hooks/use-team-detail";
import BulkAssigneeModal from "@/components/ui/modals/bulk-assignee-modal";
import type { Task } from "@/src/types/task";

interface BulkAssigneeContextType {
  // モーダル開閉
  openBulkAssigneeModal: (
    checkedTaskIds: Set<number | string>,
    taskItems: Array<{ content?: Task; itemId?: string | number; id?: number }>,
    onComplete: () => void,
  ) => void;
  closeBulkAssigneeModal: () => void;
  isOpen: boolean;
}

const BulkAssigneeContext = createContext<BulkAssigneeContextType | undefined>(
  undefined,
);

export function BulkAssigneeProvider({ children }: { children: ReactNode }) {
  const params = useParams();
  const { isTeamMode: teamMode, teamId } = useTeamContext();

  // URLからcustomUrlを取得
  const customUrl = Array.isArray(params.customUrl)
    ? params.customUrl[0]
    : params.customUrl || "";

  // モーダル状態
  const [isOpen, setIsOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  // 選択されたタスク情報（モーダル表示時に設定）
  const [checkedTaskIds, setCheckedTaskIds] = useState<Set<number | string>>(
    new Set(),
  );
  const [taskItems, setTaskItems] = useState<
    Array<{ content?: Task; itemId?: string | number; id?: number }>
  >([]);
  const [onCompleteCallback, setOnCompleteCallback] = useState<
    (() => void) | null
  >(null);

  // チームメンバー取得（customUrlを使用）
  const { data: teamDetail } = useTeamDetail(
    teamMode && customUrl ? customUrl : "",
  );
  const teamMembers = teamDetail?.members || [];

  // タスク更新フック
  const updateTask = useUpdateTask({ teamMode, teamId: teamId ?? undefined });

  // 選択中タスクの現在の担当者を計算
  const currentSelectedAssigneeId = useMemo(() => {
    if (checkedTaskIds.size === 0) return undefined;

    const selectedTaskIds = Array.from(checkedTaskIds);
    const selectedTaskItems = taskItems.filter((item) => {
      // task-screen: Task[] の場合は item 自体が Task
      // board-detail-screen: BoardItem[] の場合は item.content が Task
      const taskId = item.content?.id || item.id;
      return selectedTaskIds.includes(taskId as number | string);
    });

    if (selectedTaskItems.length === 0) return undefined;

    // task-screen: item が Task の場合は item.assigneeId
    // board-detail-screen: item.content が Task の場合は item.content.assigneeId
    const firstItem = selectedTaskItems[0];
    const firstAssignee =
      firstItem?.content?.assigneeId ||
      (firstItem as unknown as Task)?.assigneeId;
    const allSame = selectedTaskItems.every((item) => {
      const assigneeId =
        item.content?.assigneeId || (item as unknown as Task)?.assigneeId;
      return assigneeId === firstAssignee;
    });

    return allSame ? firstAssignee : undefined;
  }, [checkedTaskIds, taskItems]);

  // モーダルを開く
  const openBulkAssigneeModal = useCallback(
    (
      ids: Set<number | string>,
      items: Array<{
        content?: Task;
        itemId?: string | number;
        id?: number;
      }>,
      onComplete: () => void,
    ) => {
      setCheckedTaskIds(ids);
      setTaskItems(items);
      setOnCompleteCallback(() => onComplete);
      setIsOpen(true);
    },
    [],
  );

  // モーダルを閉じる
  const closeBulkAssigneeModal = useCallback(() => {
    setIsOpen(false);
  }, []);

  // 担当者一括更新
  const handleBulkAssigneeUpdate = useCallback(
    async (assigneeId: string | null) => {
      if (checkedTaskIds.size === 0) return;

      setIsUpdating(true);
      try {
        const taskIds = Array.from(checkedTaskIds).map((id) => {
          if (typeof id === "number") return id;
          // 文字列の場合はtaskItemsからcontent.idまたはidを探す
          const item = taskItems.find(
            (t) =>
              t.itemId === id ||
              t.content?.displayId === id ||
              t.id === parseInt(String(id), 10),
          );
          return item?.content?.id || item?.id || parseInt(String(id), 10);
        });

        const updatePromises = taskIds.map((taskId) =>
          updateTask.mutateAsync({
            id: taskId,
            data: { assigneeId },
          }),
        );
        await Promise.all(updatePromises);

        setIsOpen(false);
        onCompleteCallback?.();
      } catch (error) {
        console.error("担当者の一括設定に失敗しました:", error);
      } finally {
        setIsUpdating(false);
      }
    },
    [checkedTaskIds, taskItems, updateTask, onCompleteCallback],
  );

  return (
    <BulkAssigneeContext.Provider
      value={{
        openBulkAssigneeModal,
        closeBulkAssigneeModal,
        isOpen,
      }}
    >
      {children}
      {/* モーダルをProviderレベルで描画（チームモードのみ） */}
      {teamMode && (
        <BulkAssigneeModal
          isOpen={isOpen}
          onClose={closeBulkAssigneeModal}
          onConfirm={handleBulkAssigneeUpdate}
          members={teamMembers}
          selectedCount={checkedTaskIds.size}
          isLoading={isUpdating}
          currentAssigneeId={currentSelectedAssigneeId}
        />
      )}
    </BulkAssigneeContext.Provider>
  );
}

export function useBulkAssignee() {
  const context = useContext(BulkAssigneeContext);
  if (context === undefined) {
    throw new Error(
      "useBulkAssignee must be used within a BulkAssigneeProvider",
    );
  }
  return context;
}

// Provider外でも安全に使用できるフック
export function useBulkAssigneeSafe() {
  return useContext(BulkAssigneeContext);
}
