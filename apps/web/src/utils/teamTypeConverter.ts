import type { Memo } from "@/src/types/memo";
import type { Task } from "@/src/types/task";
import type { TeamTask } from "@/src/hooks/use-team-tasks";
import type { TeamMemo } from "@/src/hooks/use-team-memos";

/**
 * TeamTaskをTaskに安全に変換する
 * 作成者情報を明示的に保持しながらTask型にキャストする
 */
export function convertTeamTaskToTask(teamTask: TeamTask): Task {
  return {
    ...teamTask,
    createdBy: teamTask.createdBy,
    userId: teamTask.userId,
    avatarColor: teamTask.avatarColor,
  } as Task;
}

/**
 * TeamMemoをMemoに安全に変換する
 * 作成者情報を明示的に保持しながらMemo型にキャストする
 */
export function convertTeamMemoToMemo(teamMemo: TeamMemo): Memo {
  return {
    ...teamMemo,
    createdBy: teamMemo.createdBy,
    userId: teamMemo.userId,
    avatarColor: teamMemo.avatarColor,
  } as Memo;
}

/**
 * 配列のTeamTaskを配列のTaskに変換する
 */
export function convertTeamTasksToTasks(teamTasks: TeamTask[]): Task[] {
  return teamTasks.map(convertTeamTaskToTask);
}

/**
 * 配列のTeamMemoを配列のMemoに変換する
 */
export function convertTeamMemosToMemos(teamMemos: TeamMemo[]): Memo[] {
  return teamMemos.map(convertTeamMemoToMemo);
}

/**
 * TeamTaskまたはTeamMemoから作成者情報を抽出する
 */
export function extractCreatorInfo(teamItem: TeamTask | TeamMemo | null): {
  createdBy?: string | null;
  userId?: string;
  avatarColor?: string | null;
} | null {
  if (!teamItem) return null;

  return {
    createdBy: teamItem.createdBy,
    userId: teamItem.userId,
    avatarColor: teamItem.avatarColor,
  };
}
