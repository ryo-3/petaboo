import MemoIcon from "@/components/icons/memo-icon";
import TaskIcon from "@/components/icons/task-icon";
import AddItemButton from "@/components/ui/buttons/add-item-button";
import MemoEditor from "@/components/features/memo/memo-editor";
import TaskEditor from "@/components/features/task/task-editor";
import RightPanel from "@/components/ui/layout/right-panel";
import {
  useBoardWithItems,
  useRemoveItemFromBoard,
} from "@/src/hooks/use-boards";
import { BoardItemWithContent } from "@/src/types/board";
import { Memo } from "@/src/types/memo";
import { Task } from "@/src/types/task";
import { getTimeAgo } from "@/src/utils/dateUtils";
import { useEffect, useState, useCallback } from "react";
import AddItemModal from "./add-item-modal";
import BoardHeader from "./board-header";

interface BoardDetailProps {
  boardId: number;
  onBack: () => void;
  onSelectMemo?: (memo: Memo | null) => void;
  onSelectTask?: (task: Task | null) => void;
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

export default function BoardDetail({ 
  boardId, 
  onBack,
  initialBoardName,
  initialBoardDescription,
  showBoardHeader = true,
  serverInitialTitle,
  boardCompleted = false,
  isDeleted = false
}: BoardDetailProps) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedMemo, setSelectedMemo] = useState<Memo | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const { data: boardWithItems, isLoading, error } = useBoardWithItems(boardId);
  const removeItemFromBoard = useRemoveItemFromBoard();

  // ボード名は即座に表示
  const boardName = initialBoardName || boardWithItems?.name || "ボード";
  const boardDescription = initialBoardDescription || boardWithItems?.description;

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
        if (item.itemType === "memo" && selectedMemo && selectedMemo.id === item.itemId) {
          setSelectedMemo(null);
        } else if (item.itemType === "task" && selectedTask && selectedTask.id === item.itemId) {
          setSelectedTask(null);
        }
      } catch (error) {
        console.error("Failed to remove item:", error);
      }
    }
  };

  const handleSelectMemo = useCallback((memo: Memo) => {
    // デバッグ用ログ
    console.log('🔍 handleSelectMemo called:', memo.id, memo.title);
    
    // タスクの選択を先にクリアしてから、メモを選択
    setSelectedTask(null);
    setTimeout(() => {
      setSelectedMemo(memo);
    }, 0);
  }, []);

  const handleSelectTask = useCallback((task: Task) => {
    // デバッグ用ログ
    console.log('🔍 handleSelectTask called:', task.id, task.title);
    
    // メモの選択を先にクリアしてから、タスクを選択
    setSelectedMemo(null);
    setTimeout(() => {
      setSelectedTask(task);
    }, 0);
  }, []);

  const handleCloseDetail = useCallback(() => {
    console.log('🔍 handleCloseDetail called');
    setSelectedMemo(null);
    setSelectedTask(null);
  }, []);

  const handleExport = () => {
    if (!boardWithItems) return;

    const exportData = {
      name: boardName,
      description: boardDescription || null,
      createdAt: new Date((boardWithItems.createdAt as number) * 1000).toLocaleString('ja-JP'),
      memos: memoItems.map(item => {
        const memo = item.content as Memo;
        return {
          title: memo.title,
          content: memo.content,
          createdAt: new Date((memo.createdAt as number) * 1000).toLocaleString('ja-JP'),
        };
      }),
      tasks: taskItems.map(item => {
        const task = item.content as Task;
        return {
          title: task.title,
          description: task.description,
          status: task.status,
          priority: task.priority,
          createdAt: new Date((task.createdAt as number) * 1000).toLocaleString('ja-JP'),
        };
      })
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
          text += `   ${memo.content.replace(/\n/g, '\n   ')}\n`;
        }
        text += `   作成日: ${memo.createdAt}\n\n`;
      });
    }

    if (data.tasks.length > 0) {
      text += "## タスク\n";
      data.tasks.forEach((task, index: number) => {
        const statusText = task.status === 'completed' ? '完了' : 
                          task.status === 'in_progress' ? '進行中' : '未着手';
        const priorityText = task.priority === 'high' ? '高' : 
                            task.priority === 'low' ? '低' : '中';
        
        text += `${index + 1}. [${statusText}] ${task.title} (優先度: ${priorityText})\n`;
        if (task.description) {
          text += `   ${task.description.replace(/\n/g, '\n   ')}\n`;
        }
        text += `   作成日: ${task.createdAt}\n\n`;
      });
    }

    return text;
  };

  const downloadAsFile = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
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
  const memoItems = boardWithItems?.items.filter(
    (item) => item.itemType === "memo"
  ) || [];
  const taskItems = boardWithItems?.items.filter(
    (item) => item.itemType === "task"
  ) || [];

  const screenHeight = 'h-[calc(100vh-64px)]'; // 既存画面と同じ高さ設定

  return (
    <div className={`flex ${screenHeight} bg-white overflow-hidden`}>
      {/* 左側：メモ・タスク一覧 */}
      <div className={`${selectedMemo || selectedTask ? 'w-[44%] border-r border-gray-300 pr-2' : 'w-full'} pt-6 pl-6 ${selectedMemo || selectedTask ? 'pr-2' : 'pr-6'} flex flex-col transition-all duration-300 relative`}>
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 flex-1 overflow-y-auto">
            {/* メモ列 */}
            <div className={`bg-gray-50 rounded-lg p-4 flex flex-col ${selectedMemo ? 'ring-2 ring-Green' : ''}`}>
          <div className="flex items-center gap-4 mb-4">
            <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-1">
              <MemoIcon className="w-5 h-5 text-Green" />
              メモ
            </h2>
            <span className="text-sm font-normal text-gray-500">
              {memoItems.length}
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

          <div className="space-y-3 flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="text-gray-500 text-center py-8">
                メモを読み込み中...
              </div>
            ) : memoItems.length === 0 ? (
              <div className="text-gray-500 text-center py-8">
                メモがありません
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
            <div className={`bg-gray-50 rounded-lg p-4 flex flex-col ${selectedTask ? 'ring-2 ring-DeepBlue' : ''}`}>
          <div className="flex items-center gap-4 mb-4">
            <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-1">
              <TaskIcon className="w-5 h-5 text-DeepBlue" />
              タスク
            </h2>
            <span className="text-sm font-normal text-gray-500">
              {taskItems.length}
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

          <div className="space-y-3 flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="text-gray-500 text-center py-8">
                タスクを読み込み中...
              </div>
            ) : taskItems.length === 0 ? (
              <div className="text-gray-500 text-center py-8">
                タスクがありません
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
        {selectedMemo && (
          <MemoEditor
            key={`memo-${selectedMemo.id}`}
            memo={selectedMemo}
            onClose={() => {
              console.log('🔍 MemoEditor onClose called');
              // エディター内からの閉じる操作は無視（右パネルの×ボタンのみで閉じる）
            }}
            onSaveComplete={(savedMemo) => {
              // 保存後に選択状態を更新
              console.log('🔍 MemoEditor onSaveComplete:', savedMemo.id);
              setSelectedMemo(savedMemo);
            }}
          />
        )}
        
        {selectedTask && (
          <TaskEditor
            key={`task-${selectedTask.id}`}
            task={selectedTask}
            onClose={() => {
              console.log('🔍 TaskEditor onClose called');
              // エディター内からの閉じる操作は無視（右パネルの×ボタンのみで閉じる）
            }}
            onSaveComplete={(savedTask) => {
              // 保存後に選択状態を更新
              console.log('🔍 TaskEditor onSaveComplete:', savedTask.id);
              setSelectedTask(savedTask);
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
