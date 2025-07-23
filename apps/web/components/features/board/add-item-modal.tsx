import { useState } from "react";
import { useMemos } from "@/src/hooks/use-memos";
import { useTasks } from "@/src/hooks/use-tasks";
import { useAddItemToBoard } from "@/src/hooks/use-boards";
import { Memo } from "@/src/types/memo";
import { Task } from "@/src/types/task";

interface AddItemModalProps {
  boardId: number;
  isOpen: boolean;
  onClose: () => void;
}

export default function AddItemModal({ boardId, isOpen, onClose }: AddItemModalProps) {
  const [activeTab, setActiveTab] = useState<'memo' | 'task'>('memo');
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());

  const { data: memos = [] } = useMemos();
  const { data: tasks = [] } = useTasks();
  const addItemToBoard = useAddItemToBoard();

  const handleToggleItem = (itemId: number) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(itemId)) {
      newSelected.delete(itemId);
    } else {
      newSelected.add(itemId);
    }
    setSelectedItems(newSelected);
  };

  const handleAddSelected = async () => {
    try {
      for (const itemId of selectedItems) {
        await addItemToBoard.mutateAsync({
          boardId,
          data: {
            itemType: activeTab,
            itemId: itemId.toString(),
          },
        });
      }
      setSelectedItems(new Set());
      onClose();
    } catch (error) {
      console.error("Failed to add items to board:", error);
      alert("アイテムの追加に失敗しました");
    }
  };

  if (!isOpen) return null;

  const currentItems = activeTab === 'memo' ? memos : tasks;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-2xl max-h-[80vh] overflow-hidden">
        {/* ヘッダー */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">ボードにアイテムを追加</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            ×
          </button>
        </div>

        {/* タブ */}
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('memo')}
            className={`flex-1 py-3 px-4 text-sm font-medium ${
              activeTab === 'memo'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            📝 メモ ({memos.length})
          </button>
          <button
            onClick={() => setActiveTab('task')}
            className={`flex-1 py-3 px-4 text-sm font-medium ${
              activeTab === 'task'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            ✅ タスク ({tasks.length})
          </button>
        </div>

        {/* アイテム一覧 */}
        <div className="p-4 max-h-96 overflow-y-auto">
          {currentItems.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {activeTab === 'memo' ? 'メモ' : 'タスク'}がありません
            </div>
          ) : (
            <div className="space-y-2">
              {currentItems.map((item) => (
                <ItemCard
                  key={item.id}
                  item={item}
                  type={activeTab}
                  isSelected={selectedItems.has(item.id)}
                  onToggle={() => handleToggleItem(item.id)}
                />
              ))}
            </div>
          )}
        </div>

        {/* フッター */}
        <div className="flex items-center justify-between p-4 border-t border-gray-200">
          <div className="text-sm text-gray-600">
            {selectedItems.size}個のアイテムを選択中
          </div>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              キャンセル
            </button>
            <button
              onClick={handleAddSelected}
              disabled={selectedItems.size === 0 || addItemToBoard.isPending}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {addItemToBoard.isPending ? "追加中..." : "追加"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

interface ItemCardProps {
  item: Memo | Task;
  type: 'memo' | 'task';
  isSelected: boolean;
  onToggle: () => void;
}

function ItemCard({ item, type, isSelected, onToggle }: ItemCardProps) {
  const task = type === 'task' ? item as Task : null;

  return (
    <div 
      onClick={onToggle}
      className={`p-3 border rounded-lg cursor-pointer transition-colors ${
        isSelected 
          ? 'border-blue-500 bg-blue-50' 
          : 'border-gray-200 hover:border-gray-300'
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={onToggle}
            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-gray-900 line-clamp-1">{item.title}</h3>
          {'description' in item && item.description && (
            <p className="text-sm text-gray-600 line-clamp-2 mt-1">{item.description}</p>
          )}
          {'content' in item && item.content && (
            <p className="text-sm text-gray-600 line-clamp-2 mt-1">{item.content}</p>
          )}
          {task && (
            <div className="flex items-center gap-2 mt-2">
              <span className={`text-xs px-2 py-1 rounded ${
                task.status === 'completed' 
                  ? 'bg-green-100 text-green-700'
                  : task.status === 'in_progress'
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-gray-100 text-gray-700'
              }`}>
                {task.status === 'completed' ? '完了' : task.status === 'in_progress' ? '進行中' : '未着手'}
              </span>
              <span className={`text-xs px-2 py-1 rounded ${
                task.priority === 'high'
                  ? 'bg-red-100 text-red-700'
                  : task.priority === 'low'
                  ? 'bg-gray-100 text-gray-600'
                  : 'bg-yellow-100 text-yellow-700'
              }`}>
                {task.priority === 'high' ? '高' : task.priority === 'low' ? '低' : '中'}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}