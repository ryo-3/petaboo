import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@clerk/nextjs";
import { tasksApi } from "@/src/lib/api-client";
import type { TaskStatusHistoryItem } from "@/src/types/task";

interface UseTaskStatusHistoryOptions {
  taskId: number | null;
  teamMode?: boolean;
  teamId?: number;
  enabled?: boolean;
}

interface TaskStatusHistoryResponse {
  history: TaskStatusHistoryItem[];
}

/**
 * タスクのステータス変更履歴を取得するフック
 */
export function useTaskStatusHistory(options: UseTaskStatusHistoryOptions) {
  const { getToken } = useAuth();
  const { taskId, teamMode = false, teamId, enabled = true } = options;

  return useQuery<TaskStatusHistoryItem[]>(
    teamMode
      ? ["team-task-status-history", teamId, taskId]
      : ["task-status-history", taskId],
    async () => {
      if (!taskId) return [];

      const token = await getToken();

      if (teamMode && teamId) {
        const response = await tasksApi.getTeamTaskStatusHistory(
          teamId,
          taskId,
          token || undefined,
        );
        const data: TaskStatusHistoryResponse = await response.json();
        return data.history;
      } else {
        const response = await tasksApi.getTaskStatusHistory(
          taskId,
          token || undefined,
        );
        const data: TaskStatusHistoryResponse = await response.json();
        return data.history;
      }
    },
    {
      enabled:
        enabled && taskId !== null && (teamMode ? Boolean(teamId) : true),
      staleTime: 30 * 1000, // 30秒
      cacheTime: 5 * 60 * 1000, // 5分
      refetchOnWindowFocus: false,
    },
  );
}
