import { useTeamTasks } from "./use-team-tasks";
import { useTeamMemos } from "./use-team-memos";
import { extractCreatorInfo } from "@/src/utils/teamTypeConverter";
import type { Memo, DeletedMemo } from "@/src/types/memo";
import type { Task, DeletedTask } from "@/src/types/task";

export interface CreatorInfo {
  createdBy?: string | null;
  userId?: string;
  avatarColor?: string | null;
}

/**
 * チーム機能での作成者情報取得用カスタムフック
 * 選択されたメモ・タスクの作成者情報を効率的に取得する
 */
export function useCreatorInfo(
  teamMode: boolean,
  teamId?: number | null,
  selectedMemo?: Memo | DeletedMemo | null,
  selectedTask?: Task | DeletedTask | null,
) {
  const { data: teamTasksData } = useTeamTasks(
    teamMode && teamId ? teamId : undefined,
  );
  const { data: teamMemosData } = useTeamMemos(
    teamMode && teamId ? teamId : undefined,
  );

  /**
   * 選択されたタスクの作成者情報を取得
   */
  const selectedTaskCreatorInfo: CreatorInfo | null =
    teamMode && selectedTask && teamTasksData
      ? extractCreatorInfo(
          teamTasksData.find((task) => task.id === selectedTask.id) || null,
        )
      : null;

  /**
   * 選択されたメモの作成者情報を取得
   */
  const selectedMemoCreatorInfo: CreatorInfo | null =
    teamMode && selectedMemo && teamMemosData
      ? extractCreatorInfo(
          teamMemosData.find((memo) => memo.id === selectedMemo.id) || null,
        )
      : null;

  /**
   * 指定されたタスクIDの作成者情報を取得
   */
  const getTaskCreatorInfo = (taskId: number): CreatorInfo | null => {
    if (!teamMode || !teamTasksData) return null;
    return extractCreatorInfo(
      teamTasksData.find((task) => task.id === taskId) || null,
    );
  };

  /**
   * 指定されたメモIDの作成者情報を取得
   */
  const getMemoCreatorInfo = (memoId: number): CreatorInfo | null => {
    if (!teamMode || !teamMemosData) return null;
    return extractCreatorInfo(
      teamMemosData.find((memo) => memo.id === memoId) || null,
    );
  };

  return {
    selectedTaskCreatorInfo,
    selectedMemoCreatorInfo,
    getTaskCreatorInfo,
    getMemoCreatorInfo,
    // 元データも公開（必要に応じて）
    teamTasksData,
    teamMemosData,
  };
}
