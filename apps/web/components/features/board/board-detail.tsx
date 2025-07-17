import MemoEditor from "@/components/features/memo/memo-editor";
import TaskEditor from "@/components/features/task/task-editor";
import MemoIcon from "@/components/icons/memo-icon";
import TaskIcon from "@/components/icons/task-icon";
import TrashIcon from "@/components/icons/trash-icon";
import AddItemButton from "@/components/ui/buttons/add-item-button";
import RightPanel from "@/components/ui/layout/right-panel";
import {
  useBoardWithItems,
  useRemoveItemFromBoard,
} from "@/src/hooks/use-boards";
import { BoardItemWithContent } from "@/src/types/board";
import { Memo } from "@/src/types/memo";
import { Task } from "@/src/types/task";
import { getTimeAgo } from "@/src/utils/dateUtils";
import { memo, useCallback, useEffect, useState } from "react";
import AddItemModal from "./add-item-modal";
import BoardHeader from "./board-header";

interface BoardDetailProps {
  boardId: number;
  onBack: () => void;
  selectedMemo?: Memo | null;
  selectedTask?: Task | null;
  onSelectMemo?: (memo: Memo | null) => void;
  onSelectTask?: (task: Task | null) => void;
  onClearSelection?: () => void;
  initialBoardName?: string;
  initialBoardDescription?: string | null;
  showBoardHeader?: boolean;
  serverInitialTitle?: string;
  boardCompleted?: boolean;
  isDeleted?: boolean;
}

interface ExportData {
  name: string;
  description: string | null;
  createdAt: string;
  memos: {
    title: string;
    content: string | null;
    createdAt: string;
  }[];
  tasks: {
    title: string;
    description: string | null;
    status: string;
    priority: string;
    createdAt: string;
  }[];
}

function BoardDetail({
  boardId,
  onBack,
  selectedMemo: propSelectedMemo,
  selectedTask: propSelectedTask,
  onSelectMemo,
  onSelectTask,
  onClearSelection,
  initialBoardName,
  initialBoardDescription,
  showBoardHeader = true,
  serverInitialTitle,
  boardCompleted = false,
  isDeleted = false,
}: BoardDetailProps) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [activeTaskTab, setActiveTaskTab] = useState<
    "todo" | "in_progress" | "completed" | "deleted"
  >("todo");
  const [activeMemoTab, setActiveMemoTab] = useState<"normal" | "deleted">("normal");
  const [showTabText, setShowTabText] = useState(true);

  // propsから選択状態を使用（Fast Refresh対応）
  const selectedMemo = propSelectedMemo;
  const selectedTask = propSelectedTask;
  const { data: boardWithItems, isLoading, error } = useBoardWithItems(boardId);
  const removeItemFromBoard = useRemoveItemFromBoard();

  // 右パネルの開閉に応じてタブテキストの表示を制御
  useEffect(() => {
    if (selectedMemo || selectedTask) {
      // 右パネルが開いたらすぐにテキストを非表示
      setShowTabText(false);
    } else {
      // 右パネルが閉じたら300ms後にテキストを表示
      const timer = setTimeout(() => {
        setShowTabText(true);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [selectedMemo, selectedTask]);

  // ボード名は即座に表示
  const boardName = initialBoardName || boardWithItems?.name || "ボード";
  const boardDescription =
    initialBoardDescription || boardWithItems?.description;

  // console.log('🔍 BoardDetail状態:', {
  //   initialBoardName,
  //   boardWithItemsName: boardWithItems?.name,
  //   boardName,
  //   isLoading,
  //   error: !!error
  // });

  // ページタイトル設定
  useEffect(() => {
    document.title = `${boardName} - ボード`;
    return () => {
      document.title = "メモ帳アプリ";
    };
  }, [boardName]);

  const handleRemoveItem = async (item: BoardItemWithContent) => {
    if (confirm("このアイテムをボードから削除しますか？")) {
      try {
        await removeItemFromBoard.mutateAsync({
          boardId,
          itemId: item.itemId,
          itemType: item.itemType,
        });
        // 削除したアイテムが選択されていた場合、選択を解除
        if (
          item.itemType === "memo" &&
          selectedMemo &&
          selectedMemo.id === item.itemId
        ) {
          onClearSelection?.();
        } else if (
          item.itemType === "task" &&
          selectedTask &&
          selectedTask.id === item.itemId
        ) {
          onClearSelection?.();
        }
      } catch (error) {
        console.error("Failed to remove item:", error);
      }
    }
  };

  const handleSelectMemo = useCallback(
    (memo: Memo) => {
      onSelectMemo?.(memo);
    },
    [onSelectMemo]
  );

  const handleSelectTask = useCallback(
    (task: Task) => {
      onSelectTask?.(task);
    },
    [onSelectTask]
  );

  const handleCloseDetail = useCallback(() => {
    onClearSelection?.();
  }, [onClearSelection]);

  // タスクタブ切り替え時の処理
  const handleTaskTabChange = useCallback(
    (newTab: "todo" | "in_progress" | "completed" | "deleted") => {
      setActiveTaskTab(newTab);
      // 選択解除は行わない（タブ切り替えで選択状態は保持）
    },
    []
  );

  // メモタブ切り替え時の処理
  const handleMemoTabChange = useCallback(
    (newTab: "normal" | "deleted") => {
      setActiveMemoTab(newTab);
      // 選択解除は行わない（タブ切り替えで選択状態は保持）
    },
    []
  );

  const handleExport = () => {
    if (!boardWithItems) return;

    const exportData = {
      name: boardName,
      description: boardDescription || null,
      createdAt: new Date(
        (boardWithItems.createdAt as number) * 1000
      ).toLocaleString("ja-JP"),
      memos: memoItems.map((item) => {
        const memo = item.content as Memo;
        return {
          title: memo.title,
          content: memo.content,
          createdAt: new Date((memo.createdAt as number) * 1000).toLocaleString(
            "ja-JP"
          ),
        };
      }),
      tasks: taskItems.map((item) => {
        const task = item.content as Task;
        return {
          title: task.title,
          description: task.description,
          status: task.status,
          priority: task.priority,
          createdAt: new Date((task.createdAt as number) * 1000).toLocaleString(
            "ja-JP"
          ),
        };
      }),
    };

    const textContent = formatAsText(exportData);
    downloadAsFile(textContent, `${boardName}.txt`);
  };

  const formatAsText = (data: ExportData) => {
    let text = `ボード名: ${data.name}\n`;
    if (data.description) {
      text += `説明: ${data.description}\n`;
    }
    text += `作成日: ${data.createdAt}\n\n`;

    if (data.memos.length > 0) {
      text += "## メモ\n";
      data.memos.forEach((memo, index: number) => {
        text += `${index + 1}. ${memo.title}\n`;
        if (memo.content) {
          text += `   ${memo.content.replace(/\n/g, "\n   ")}\n`;
        }
        text += `   作成日: ${memo.createdAt}\n\n`;
      });
    }

    if (data.tasks.length > 0) {
      text += "## タスク\n";
      data.tasks.forEach((task, index: number) => {
        const statusText =
          task.status === "completed"
            ? "完了"
            : task.status === "in_progress"
              ? "進行中"
              : "未着手";
        const priorityText =
          task.priority === "high"
            ? "高"
            : task.priority === "low"
              ? "低"
              : "中";

        text += `${index + 1}. [${statusText}] ${task.title} (優先度: ${priorityText})\n`;
        if (task.description) {
          text += `   ${task.description.replace(/\n/g, "\n   ")}\n`;
        }
        text += `   作成日: ${task.createdAt}\n\n`;
      });
    }

    return text;
  };

  const downloadAsFile = (content: string, filename: string) => {
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // エラー時のみエラー表示
  if (error) {
    return (
      <div className={showBoardHeader ? "p-6" : ""}>
        {showBoardHeader && (
          <BoardHeader
            boardId={boardId}
            boardName={serverInitialTitle || boardName}
            boardDescription={boardDescription}
            boardCompleted={boardCompleted}
            isDeleted={isDeleted}
            onBack={onBack}
            onExport={() => {}}
            isExportDisabled={true}
          />
        )}
        <div className="text-center py-8">
          <p className="text-red-500">アイテムの読み込みに失敗しました</p>
        </div>
      </div>
    );
  }

  // メモとタスクのアイテムを分離（読み込み中も空配列で処理）
  const allMemoItems =
    boardWithItems?.items.filter((item) => item.itemType === "memo") || [];
  const allTaskItems =
    boardWithItems?.items.filter((item) => item.itemType === "task") || [];

  // アクティブタブに応じてメモをフィルタリング
  const memoItems = allMemoItems.filter((item) => {
    if (activeMemoTab === "deleted") {
      // 削除済みは将来的に別のAPIから取得予定、現在は空配列
      return false;
    }
    return true; // normal の場合はすべて表示
  });

  // アクティブタブに応じてタスクをフィルタリング
  const taskItems = allTaskItems.filter((item) => {
    const task = item.content as Task;
    if (activeTaskTab === "deleted") {
      // 削除済みは将来的に別のAPIから取得予定、現在は空配列
      return false;
    }
    return task.status === activeTaskTab;
  });

  // 各ステータスの件数を計算
  const todoCount = allTaskItems.filter(
    (item) => (item.content as Task).status === "todo"
  ).length;
  const inProgressCount = allTaskItems.filter(
    (item) => (item.content as Task).status === "in_progress"
  ).length;
  const completedCount = allTaskItems.filter(
    (item) => (item.content as Task).status === "completed"
  ).length;
  const deletedCount = 0; // 削除済みタスクの件数（将来実装）
  
  // メモの件数を計算
  const normalMemoCount = allMemoItems.length;
  const deletedMemoCount = 0; // 削除済みメモの件数（将来実装）

  const screenHeight = "h-[calc(100vh-64px)]"; // 既存画面と同じ高さ設定

  return (
    <div className={`flex ${screenHeight} bg-white overflow-hidden`}>
      {/* 左側：メモ・タスク一覧 */}
      <div
        className={`${selectedMemo || selectedTask ? "w-[47%] border-r border-gray-300" : "w-full"} pt-4 pl-4 pr-4 ${selectedMemo || selectedTask ? "pr-2" : "pr-4"} flex flex-col transition-all duration-300 relative`}
      >
        {/* 左側のヘッダー */}
        {showBoardHeader && (
          <BoardHeader
            boardId={boardId}
            boardName={boardName}
            boardDescription={boardDescription}
            boardCompleted={boardCompleted}
            isDeleted={isDeleted}
            onBack={onBack}
            onExport={handleExport}
            isExportDisabled={false}
          />
        )}

        {/* メモ・タスクコンテンツ */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 flex-1 overflow-y-auto">
          {/* メモ列 */}
          <div
            className="flex flex-col"
          >
            <div className="flex items-center gap-2 mb-2">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold text-gray-800 flex items-center gap-1">
                  <MemoIcon className="w-4 h-4 text-Green" />
                  メモ
                </h2>
                <span className="text-sm font-normal text-gray-500">
                  {allMemoItems.length}
                </span>
                <AddItemButton
                  itemType="memo"
                  onClick={() => setShowAddModal(true)}
                  size="small"
                  showTooltip={false}
                  customSize={{
                    padding: "p-1",
                    iconSize: "size-4",
                  }}
                />
              </div>

              {/* メモステータスタブ */}
              <div className="flex items-center gap-1 flex-wrap">
                <button
                  onClick={() => handleMemoTabChange("normal")}
                  className={`flex items-center gap-1 px-1.5 rounded-lg font-medium transition-colors text-gray-600 text-[12px] h-7 ${
                    activeMemoTab === "normal"
                      ? "bg-gray-200"
                      : "bg-gray-100 hover:bg-gray-200"
                  }`}
                >
                  <div className="w-2.5 h-2.5 rounded-full bg-gray-500"></div>
                  {showTabText && <span>通常</span>}
                  <span className="bg-white/20 text-[11px] px-1 py-0.5 rounded-full min-w-[20px] text-center">
                    {normalMemoCount}
                  </span>
                </button>
                <button
                  onClick={() => handleMemoTabChange("deleted")}
                  className={`flex items-center px-1.5 rounded-lg font-medium transition-colors text-gray-600 text-[12px] h-7 ${
                    activeMemoTab === "deleted"
                      ? "bg-red-100"
                      : "bg-gray-100 hover:bg-red-100"
                  }`}
                >
                  <TrashIcon className="w-4 h-4" />
                  <span
                    className={`text-xs transition-all overflow-hidden text-right ${
                      activeMemoTab === "deleted"
                        ? "opacity-100 w-9 translate-x-0 px-1.5 ml-1"
                        : "opacity-0 w-0 translate-x-2 px-0"
                    }`}
                  >
                    {deletedMemoCount}
                  </span>
                </button>
              </div>
            </div>

            <div className="space-y-3 flex-1 overflow-y-auto">
              {isLoading ? (
                <div className="text-gray-500 text-center py-8">
                  メモを読み込み中...
                </div>
              ) : memoItems.length === 0 ? (
                <div className="text-gray-500 text-center py-8">
                  {activeMemoTab === "deleted" ? "削除済みメモがありません" : "メモがありません"}
                </div>
              ) : (
                memoItems.map((item) => (
                  <MemoItemCard
                    key={`memo-${item.itemId}`}
                    item={item}
                    memo={item.content as Memo}
                    onRemove={() => handleRemoveItem(item)}
                    onClick={() => handleSelectMemo(item.content as Memo)}
                  />
                ))
              )}
            </div>
          </div>

          {/* タスク列 */}
          <div
            className="flex flex-col"
          >
            <div className="flex items-center gap-2 mb-2">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold text-gray-800 flex items-center gap-1">
                  <TaskIcon className="w-4 h-4 text-DeepBlue" />
                  タスク
                </h2>
                <span className="text-sm font-normal text-gray-500">
                  {allTaskItems.length}
                </span>
                <AddItemButton
                  itemType="task"
                  onClick={() => setShowAddModal(true)}
                  size="small"
                  showTooltip={false}
                  customSize={{
                    padding: "p-1",
                    iconSize: "size-4",
                  }}
                />
              </div>

              {/* タスクステータスタブ */}
              <div className="flex items-center gap-1 flex-wrap">
                <button
                  onClick={() => handleTaskTabChange("todo")}
                  className={`flex items-center gap-1 px-1.5 rounded-lg font-medium transition-colors text-gray-600 text-[12px] h-7 ${
                    activeTaskTab === "todo"
                      ? "bg-zinc-200"
                      : "bg-gray-100 hover:bg-zinc-200"
                  }`}
                >
                  <div className="w-2.5 h-2.5 rounded-full bg-zinc-400"></div>
                  {showTabText && <span>未着手</span>}
                  <span className="bg-white/20 text-[11px] px-1 py-0.5 rounded-full min-w-[20px] text-center">
                    {todoCount}
                  </span>
                </button>
                <button
                  onClick={() => handleTaskTabChange("in_progress")}
                  className={`flex items-center gap-1 px-1.5 rounded-lg font-medium transition-colors text-gray-600 text-[12px] h-7 ${
                    activeTaskTab === "in_progress"
                      ? "bg-blue-100"
                      : "bg-gray-100 hover:bg-blue-100"
                  }`}
                >
                  <div className="w-2.5 h-2.5 rounded-full bg-Blue"></div>
                  {showTabText && <span>進行中</span>}
                  <span className="bg-white/20 text-[11px] px-1 py-0.5 rounded-full min-w-[20px] text-center">
                    {inProgressCount}
                  </span>
                </button>
                <button
                  onClick={() => handleTaskTabChange("completed")}
                  className={`flex items-center gap-1 px-1.5 rounded-lg font-medium transition-colors text-gray-600 text-[12px] h-7 ${
                    activeTaskTab === "completed"
                      ? "bg-Green/20"
                      : "bg-gray-100 hover:bg-Green/20"
                  }`}
                >
                  <div className="w-2.5 h-2.5 rounded-full bg-Green"></div>
                  {showTabText && <span>完了</span>}
                  <span className="bg-white/20 text-[11px] px-1 py-0.5 rounded-full min-w-[20px] text-center">
                    {completedCount}
                  </span>
                </button>
                <button
                  onClick={() => handleTaskTabChange("deleted")}
                  className={`flex items-center px-1.5 rounded-lg font-medium transition-colors text-gray-600 text-[12px] h-7 ${
                    activeTaskTab === "deleted"
                      ? "bg-red-100"
                      : "bg-gray-100 hover:bg-red-100"
                  }`}
                >
                  <TrashIcon className="w-4 h-4" />
                  <span
                    className={`text-xs transition-all overflow-hidden text-right ${
                      activeTaskTab === "deleted"
                        ? "opacity-100 w-9 translate-x-0 px-1.5 ml-1"
                        : "opacity-0 w-0 translate-x-2 px-0"
                    }`}
                  >
                    {deletedCount}
                  </span>
                </button>
              </div>
            </div>

            <div className="space-y-3 flex-1 overflow-y-auto">
              {isLoading ? (
                <div className="text-gray-500 text-center py-8">
                  タスクを読み込み中...
                </div>
              ) : taskItems.length === 0 ? (
                <div className="text-gray-500 text-center py-8">
                  {activeTaskTab === "deleted"
                    ? "削除済みタスクがありません"
                    : "タスクがありません"}
                </div>
              ) : (
                taskItems.map((item) => (
                  <TaskItemCard
                    key={`task-${item.itemId}`}
                    item={item}
                    task={item.content as Task}
                    onRemove={() => handleRemoveItem(item)}
                    onClick={() => handleSelectTask(item.content as Task)}
                  />
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 右側：詳細表示 */}
      <RightPanel
        isOpen={selectedMemo !== null || selectedTask !== null}
        onClose={handleCloseDetail}
      >
        {selectedMemo && !selectedTask && (
          <MemoEditor
            key={`memo-${selectedMemo.id}`}
            memo={selectedMemo}
            onClose={() => {
              console.log("🔍 MemoEditor onClose called");
              // エディター内からの閉じる操作は無視（右パネルの×ボタンのみで閉じる）
            }}
            onSaveComplete={(savedMemo) => {
              // 保存後に選択状態を更新
              console.log("🔍 MemoEditor onSaveComplete:", savedMemo.id);
              onSelectMemo?.(savedMemo);
            }}
          />
        )}

        {selectedTask && !selectedMemo && (
          <TaskEditor
            key={`task-${selectedTask.id}`}
            task={selectedTask}
            onClose={() => {
              console.log("🔍 TaskEditor onClose called");
              // エディター内からの閉じる操作は無視（右パネルの×ボタンのみで閉じる）
            }}
            onSaveComplete={(savedTask) => {
              // 保存後に選択状態を更新
              console.log("🔍 TaskEditor onSaveComplete:", savedTask.id);
              onSelectTask?.(savedTask);
            }}
          />
        )}
      </RightPanel>

      {/* アイテム追加モーダル */}
      <AddItemModal
        boardId={boardId}
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
      />
    </div>
  );
}

export default memo(BoardDetail);

interface MemoItemCardProps {
  item: BoardItemWithContent;
  memo: Memo;
  onRemove: () => void;
  onClick?: () => void;
}

function MemoItemCard({ memo, onRemove, onClick }: MemoItemCardProps) {
  const updatedAt = new Date(
    memo.updatedAt ? memo.updatedAt * 1000 : memo.createdAt * 1000
  );
  const timeAgo = getTimeAgo(updatedAt);

  return (
    <div
      className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
      onClick={(e) => {
        e.stopPropagation();
        onClick?.();
      }}
    >
      <div className="flex items-start justify-between mb-2">
        <h3 className="font-medium text-gray-900 line-clamp-1">{memo.title}</h3>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="text-gray-400 hover:text-red-500 text-sm"
          title="ボードから削除"
        >
          ×
        </button>
      </div>

      {memo.content && (
        <p className="text-gray-600 text-sm line-clamp-3 mb-3">
          {memo.content}
        </p>
      )}

      <div className="text-xs text-gray-500">{timeAgo}</div>
    </div>
  );
}

interface TaskItemCardProps {
  item: BoardItemWithContent;
  task: Task;
  onRemove: () => void;
  onClick?: () => void;
}

function TaskItemCard({ task, onRemove, onClick }: TaskItemCardProps) {
  const updatedAt = new Date(
    task.updatedAt ? task.updatedAt * 1000 : task.createdAt * 1000
  );
  const timeAgo = getTimeAgo(updatedAt);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return (
          <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
            完了
          </span>
        );
      case "in_progress":
        return (
          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
            進行中
          </span>
        );
      default:
        return (
          <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
            未着手
          </span>
        );
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "high":
        return (
          <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded">
            高
          </span>
        );
      case "low":
        return (
          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
            低
          </span>
        );
      default:
        return (
          <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded">
            中
          </span>
        );
    }
  };

  return (
    <div
      className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
      onClick={(e) => {
        e.stopPropagation();
        onClick?.();
      }}
    >
      <div className="flex items-start justify-between mb-2">
        <h3 className="font-medium text-gray-900 line-clamp-1">{task.title}</h3>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="text-gray-400 hover:text-red-500 text-sm"
          title="ボードから削除"
        >
          ×
        </button>
      </div>

      {task.description && (
        <p className="text-gray-600 text-sm line-clamp-2 mb-3">
          {task.description}
        </p>
      )}

      <div className="flex items-center gap-2 mb-2">
        {getStatusBadge(task.status)}
        {getPriorityBadge(task.priority)}
      </div>

      <div className="text-xs text-gray-500">{timeAgo}</div>
    </div>
  );
}
