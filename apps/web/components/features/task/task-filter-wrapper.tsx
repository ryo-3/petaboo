import { useItemBoards } from "@/src/hooks/use-boards";
import type { Task } from "@/src/types/task";
import { ReactElement } from "react";

interface TaskFilterWrapperProps {
  task: Task;
  selectedBoardIds: number[];
  filterMode?: "include" | "exclude";
  children: ReactElement;
}

/**
 * タスクのボードフィルタリングを行うラッパーコンポーネント
 */
function TaskFilterWrapper({
  task,
  selectedBoardIds,
  filterMode = "include",
  children,
}: TaskFilterWrapperProps) {
  // タスクが所属するボード一覧を取得（フィルター無効時はundefinedを渡してクエリを無効化）
  const { data: boards, isLoading } = useItemBoards(
    "task",
    selectedBoardIds && selectedBoardIds.length > 0
      ? task.originalId || task.id.toString()
      : undefined,
  );

  // フィルターが設定されていない場合は常に表示
  if (!selectedBoardIds || selectedBoardIds.length === 0) {
    return children;
  }

  // ローディング中かつデータがない場合のみ非表示（プリフェッチキャッシュがある場合は表示）
  if (isLoading && !boards) {
    return null;
  }

  // タスクが所属するボードのID一覧を取得
  const taskBoardIds = boards ? boards.map((b) => b.id) : [];

  // フィルターモードに応じて表示判定
  let shouldShow: boolean;

  if (filterMode === "exclude") {
    // 除外モード：選択されたボードのいずれにも所属していない場合に表示
    shouldShow = !selectedBoardIds.some((selectedId) =>
      taskBoardIds.includes(selectedId),
    );
  } else {
    // 含むモード（デフォルト）：選択されたボードのいずれかに所属している場合に表示
    shouldShow = selectedBoardIds.some((selectedId) =>
      taskBoardIds.includes(selectedId),
    );
  }

  return shouldShow ? children : null;
}

export default TaskFilterWrapper;
