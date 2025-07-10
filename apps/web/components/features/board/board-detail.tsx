import { useState, useEffect } from "react";
import { useBoardWithItems, useRemoveItemFromBoard } from "@/src/hooks/use-boards";
import { BoardItemWithContent } from "@/src/types/board";
import { Memo } from "@/src/types/memo";
import { Task } from "@/src/types/task";
import { getTimeAgo } from "@/src/utils/dateUtils";
import AddItemModal from "./add-item-modal";

interface BoardDetailProps {
  boardId: number;
  onBack: () => void;
}

export default function BoardDetail({ boardId, onBack }: BoardDetailProps) {
  const [showAddModal, setShowAddModal] = useState(false);
  const { data: boardWithItems, isLoading, error } = useBoardWithItems(boardId);
  const removeItemFromBoard = useRemoveItemFromBoard();

  // ページタイトル設定
  useEffect(() => {
    if (boardWithItems) {
      document.title = `${boardWithItems.name} - ボード`;
    }
    return () => {
      document.title = "メモ帳アプリ";
    };
  }, [boardWithItems]);

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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-gray-500">ボードを読み込み中...</div>
      </div>
    );
  }

  if (error || !boardWithItems) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-red-500">ボードの読み込みに失敗しました</div>
      </div>
    );
  }

  const memoItems = boardWithItems.items.filter(item => item.itemType === 'memo');
  const taskItems = boardWithItems.items.filter(item => item.itemType === 'task');

  return (
    <div className="p-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <button
            onClick={onBack}
            className="text-blue-600 hover:text-blue-700 mb-2 flex items-center gap-1"
          >
            ← ボード一覧に戻る
          </button>
          <h1 className="text-2xl font-bold text-gray-900">{boardWithItems.name}</h1>
          {boardWithItems.description && (
            <p className="text-gray-600 mt-1">{boardWithItems.description}</p>
          )}
        </div>
        <div className="flex items-center gap-4">
          <div className="text-sm text-gray-500">
            {memoItems.length + taskItems.length} 個のアイテム
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            + アイテムを追加
          </button>
        </div>
      </div>

      {/* カンバン風レイアウト */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* メモ列 */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            📝 メモ
            <span className="text-sm font-normal text-gray-500">({memoItems.length})</span>
          </h2>
          
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
                />
              ))
            )}
          </div>
        </div>

        {/* タスク列 */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            ✅ タスク
            <span className="text-sm font-normal text-gray-500">({taskItems.length})</span>
          </h2>
          
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
}

function MemoItemCard({ memo, onRemove }: MemoItemCardProps) {
  const updatedAt = new Date(memo.updatedAt ? memo.updatedAt * 1000 : memo.createdAt * 1000);
  const timeAgo = getTimeAgo(updatedAt);

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
      <div className="flex items-start justify-between mb-2">
        <h3 className="font-medium text-gray-900 line-clamp-1">{memo.title}</h3>
        <button
          onClick={onRemove}
          className="text-gray-400 hover:text-red-500 text-sm"
          title="ボードから削除"
        >
          ×
        </button>
      </div>
      
      {memo.content && (
        <p className="text-gray-600 text-sm line-clamp-3 mb-3">{memo.content}</p>
      )}
      
      <div className="text-xs text-gray-500">
        {timeAgo}
      </div>
    </div>
  );
}

interface TaskItemCardProps {
  item: BoardItemWithContent;
  task: Task;
  onRemove: () => void;
}

function TaskItemCard({ task, onRemove }: TaskItemCardProps) {
  const updatedAt = new Date(task.updatedAt ? task.updatedAt * 1000 : task.createdAt * 1000);
  const timeAgo = getTimeAgo(updatedAt);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">完了</span>;
      case 'in_progress':
        return <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">進行中</span>;
      default:
        return <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">未着手</span>;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'high':
        return <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded">高</span>;
      case 'low':
        return <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">低</span>;
      default:
        return <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded">中</span>;
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
      <div className="flex items-start justify-between mb-2">
        <h3 className="font-medium text-gray-900 line-clamp-1">{task.title}</h3>
        <button
          onClick={onRemove}
          className="text-gray-400 hover:text-red-500 text-sm"
          title="ボードから削除"
        >
          ×
        </button>
      </div>
      
      {task.description && (
        <p className="text-gray-600 text-sm line-clamp-2 mb-3">{task.description}</p>
      )}
      
      <div className="flex items-center gap-2 mb-2">
        {getStatusBadge(task.status)}
        {getPriorityBadge(task.priority)}
      </div>
      
      <div className="text-xs text-gray-500">
        {timeAgo}
      </div>
    </div>
  );
}