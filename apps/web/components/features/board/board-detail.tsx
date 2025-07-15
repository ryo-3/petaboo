import MemoIcon from "@/components/icons/memo-icon";
import TaskIcon from "@/components/icons/task-icon";
import AddItemButton from "@/components/ui/buttons/add-item-button";
import {
  useBoardWithItems,
  useRemoveItemFromBoard,
} from "@/src/hooks/use-boards";
import { BoardItemWithContent } from "@/src/types/board";
import { Memo } from "@/src/types/memo";
import { Task } from "@/src/types/task";
import { getTimeAgo } from "@/src/utils/dateUtils";
import { useEffect, useState } from "react";
import AddItemModal from "./add-item-modal";
import BoardHeader from "./board-header";

interface BoardDetailProps {
  boardId: number;
  onBack: () => void;
  onSelectMemo?: (memo: Memo) => void;
  onSelectTask?: (task: Task) => void;
  initialBoardName?: string;
  initialBoardDescription?: string | null;
  showBoardHeader?: boolean;
  serverInitialTitle?: string;
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
  onSelectMemo, 
  onSelectTask,
  initialBoardName,
  initialBoardDescription,
  showBoardHeader = true,
  serverInitialTitle
}: BoardDetailProps) {
  const [showAddModal, setShowAddModal] = useState(false);
  const { data: boardWithItems, isLoading, error } = useBoardWithItems(boardId);
  const removeItemFromBoard = useRemoveItemFromBoard();

  // ボード名は即座に表示
  const boardName = initialBoardName || boardWithItems?.name || "ボード";
  const boardDescription = initialBoardDescription || boardWithItems?.description;

  console.log('🔍 BoardDetail状態:', {
    initialBoardName,
    boardWithItemsName: boardWithItems?.name,
    boardName,
    isLoading,
    error: !!error
  });

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
      } catch (error) {
        console.error("Failed to remove item:", error);
      }
    }
  };

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

  // アイテムの読み込み中のみローディング表示
  if (isLoading) {
    return (
      <div className={showBoardHeader ? "p-6" : ""}>
        {showBoardHeader && (
          <BoardHeader
            boardName={serverInitialTitle || boardName}
            boardDescription={boardDescription}
            itemCount={0}
            onBack={onBack}
            onExport={() => {}}
            isExportDisabled={true}
          />
        )}
        <div className="text-center py-8">
          <p className="text-gray-600">アイテムを読み込み中...</p>
        </div>
      </div>
    );
  }

  if (error || !boardWithItems) {
    return (
      <div className={showBoardHeader ? "p-6" : ""}>
        {showBoardHeader && (
          <BoardHeader
            boardName={boardName}
            boardDescription={boardDescription}
            itemCount={0}
            onBack={onBack}
            onExport={() => {}}
          />
        )}
        <div className="text-center py-8">
          <p className="text-red-500">アイテムの読み込みに失敗しました</p>
        </div>
      </div>
    );
  }

  const memoItems = boardWithItems.items.filter(
    (item) => item.itemType === "memo"
  );
  const taskItems = boardWithItems.items.filter(
    (item) => item.itemType === "task"
  );

  return (
    <div className={showBoardHeader ? "p-6" : ""}>
      {/* ヘッダー */}
      {showBoardHeader && (
        <BoardHeader
          boardName={boardName}
          boardDescription={boardDescription}
          itemCount={memoItems.length + taskItems.length}
          onBack={onBack}
          onExport={handleExport}
          isExportDisabled={false}
        />
      )}

      {/* カンバン風レイアウト */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* メモ列 */}
        <div className="bg-gray-50 rounded-lg p-4">
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

          <div className="space-y-3">
            {memoItems.length === 0 ? (
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
                  onClick={() => onSelectMemo?.(item.content as Memo)}
                />
              ))
            )}
          </div>
        </div>

        {/* タスク列 */}
        <div className="bg-gray-50 rounded-lg p-4">
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

          <div className="space-y-3">
            {taskItems.length === 0 ? (
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
                  onClick={() => onSelectTask?.(item.content as Task)}
                />
              ))
            )}
          </div>
        </div>
      </div>

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
      onClick={onClick}
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
      onClick={onClick}
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
