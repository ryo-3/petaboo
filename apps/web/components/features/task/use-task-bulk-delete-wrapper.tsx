import { useBulkDeleteUnified } from "@/src/hooks/use-bulk-delete-unified";
import { useDeleteTask, usePermanentDeleteTask } from "@/src/hooks/use-tasks";
import type { Task, DeletedTask } from "@/src/types/task";
import { useMutation } from "@tanstack/react-query";
import { useAuth } from "@clerk/nextjs";
import { tasksApi } from "@/src/lib/api-client";

interface UseTasksBulkDeleteProps {
  activeTab: "todo" | "in_progress" | "completed" | "deleted";
  checkedTasks: Set<number>;
  checkedDeletedTasks: Set<number>;
  setCheckedTasks: (tasks: Set<number>) => void;
  setCheckedDeletedTasks: (tasks: Set<number>) => void;
  tasks?: Task[];
  deletedTasks?: DeletedTask[];
  onTaskDelete?: (id: number) => void;
  deleteButtonRef?: React.RefObject<HTMLButtonElement | null>;
  setIsDeleting?: (isDeleting: boolean) => void;
  setIsLidOpen?: (isOpen: boolean) => void;
  viewMode?: "list" | "card";
  teamMode?: boolean;
  teamId?: number;
}

export function useTasksBulkDelete(props: UseTasksBulkDeleteProps) {
  const { getToken } = useAuth();

  // API関数の設定
  const apiMethods = {
    delete: (options?: { teamMode?: boolean; teamId?: number }) =>
      useDeleteTask({
        teamMode: options?.teamMode ?? props.teamMode,
        teamId: options?.teamId ?? props.teamId,
      }),
    permanentDelete: (options?: { teamMode?: boolean; teamId?: number }) =>
      usePermanentDeleteTask({
        teamMode: options?.teamMode ?? props.teamMode,
        teamId: options?.teamId ?? props.teamId,
      }),
    deleteWithoutUpdate: (token: string | null) => ({
      mutationFn: async (id: number) => {
        if (props.teamMode && props.teamId) {
          const response = await tasksApi.deleteTeamTask(
            props.teamId,
            id,
            token || undefined,
          );
          return response.json();
        } else {
          const response = await tasksApi.deleteTask(id, token || undefined);
          return response.json();
        }
      },
    }),
    permanentDeleteWithoutUpdate: (token: string | null) => ({
      mutationFn: async (id: number) => {
        if (props.teamMode && props.teamId) {
          const response = await tasksApi.permanentDeleteTeamTask(
            props.teamId,
            String(id),
            token || undefined,
          );
          return response.json();
        } else {
          const response = await tasksApi.permanentDeleteTask(
            String(id),
            token || undefined,
          );
          return response.json();
        }
      },
    }),
  };

  // ステータス別カウントを取得する関数
  const getStatusBreakdown = (taskIds: number[], tasks?: Task[]) => {
    if (props.activeTab === "deleted") {
      return [
        {
          status: "deleted",
          label: "削除済み",
          count: taskIds.length,
          color: "bg-red-600",
        },
      ];
    }

    const allTasks = tasks || [];
    const selectedTasks = allTasks.filter((task) => taskIds.includes(task.id));

    const todoCount = selectedTasks.filter(
      (task) => task.status === "todo",
    ).length;
    const inProgressCount = selectedTasks.filter(
      (task) => task.status === "in_progress",
    ).length;
    const completedCount = selectedTasks.filter(
      (task) => task.status === "completed",
    ).length;

    const breakdown = [];
    if (todoCount > 0)
      breakdown.push({
        status: "todo",
        label: "未着手",
        count: todoCount,
        color: "bg-zinc-400",
      });
    if (inProgressCount > 0)
      breakdown.push({
        status: "in_progress",
        label: "進行中",
        count: inProgressCount,
        color: "bg-Blue",
      });
    if (completedCount > 0)
      breakdown.push({
        status: "completed",
        label: "完了",
        count: completedCount,
        color: "bg-Green",
      });

    return breakdown;
  };

  // DOM順序取得関数
  const getDisplayOrder = async () => {
    const { getTaskDisplayOrder } = await import("@/src/utils/domUtils");
    return { getDomOrder: getTaskDisplayOrder };
  };

  return useBulkDeleteUnified({
    activeTab: props.activeTab,
    checkedItems: props.checkedTasks,
    checkedDeletedItems: props.checkedDeletedTasks,
    setCheckedItems: props.setCheckedTasks,
    setCheckedDeletedItems: props.setCheckedDeletedTasks,
    items: props.tasks,
    deletedItems: props.deletedTasks,
    onItemDelete: props.onTaskDelete,
    deleteButtonRef: props.deleteButtonRef,
    setIsDeleting: props.setIsDeleting,
    setIsLidOpen: props.setIsLidOpen,
    apiMethods,
    itemType: "task",
    dataAttribute: "data-task-id",
    getDisplayOrder,
    getStatusBreakdown,
    deletedTabKey: "deleted",
  });
}
