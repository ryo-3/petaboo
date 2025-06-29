"use client";

import { useUserPreferences } from "@/src/hooks/use-user-preferences";
import { useEffect, useState } from "react";
import MemoIcon from "./icons/memo-icon";
import SettingsIcon from "./icons/settings-icon";
import TaskIcon from "./icons/task-icon";
import ColumnCountSelector from "./ui/column-count-selector";
import ViewModeToggle from "./ui/view-mode-toggle";

interface SettingsScreenProps {
  onBack: () => void;
}

function SettingsScreen({ onBack }: SettingsScreenProps) {
  const { preferences, updatePreferences, isLoading } = useUserPreferences(1);

  const [memoColumnCount, setMemoColumnCount] = useState(4);
  const [taskColumnCount, setTaskColumnCount] = useState(2);
  const [memoViewMode, setMemoViewMode] = useState<"card" | "list">("list");
  const [taskViewMode, setTaskViewMode] = useState<"card" | "list">("list");

  // 設定を読み込んだらローカル状態を更新
  useEffect(() => {
    if (preferences) {
      setMemoColumnCount(preferences.memoColumnCount);
      setTaskColumnCount(preferences.taskColumnCount);
      setMemoViewMode(preferences.memoViewMode);
      setTaskViewMode(preferences.taskViewMode);
    }
  }, [preferences]);

  const handleSave = async () => {
    try {
      await updatePreferences({
        memoColumnCount,
        taskColumnCount,
        memoViewMode,
        taskViewMode,
      });
      alert("設定を保存しました！");
    } catch (error) {
      alert("設定の保存に失敗しました。");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-gray-500">設定を読み込み中...</div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-white p-6">
      {/* ヘッダー */}
      <div className="flex items-center gap-4 mb-6 border-b border-gray-200 pb-4">
        <div className="flex items-center gap-2">
          <SettingsIcon className="w-6 h-6 text-gray-600" />
          <h1 className="text-2xl font-bold text-gray-800">設定</h1>
        </div>
      </div>

      <div className="max-w-2xl">
        {/* 説明文 */}
        <div className="">
          <p className="text-sm leading-relaxed mb-3">
            ここではメモとタスクの表示設定を変更できます。設定は自動的に保存され、次回アクセス時にも適用されます。
          </p>
          <p className="text-sm leading-relaxed">
            <strong>表示モード:</strong> リスト表示は詳細情報が見やすく、カード表示は視覚的に分かりやすい表示です。<br/>
            <strong>列数:</strong> 列数を調整することで、画面サイズに合わせた最適な表示が可能です。
          </p>
        </div>

        {/* メモ設定 */}
        <div className="mt-4">
          <div className="flex items-center gap-2 mb-2">
            <MemoIcon className="w-5 h-5 mt-0.5" />
            <h2 className="text-lg font-semibold text-gray-800">メモ設定</h2>
          </div>

          {/* メモのコントロール */}
          <div className="flex items-center gap-2">
            <ViewModeToggle
              viewMode={memoViewMode}
              onViewModeChange={setMemoViewMode}
            />
            <ColumnCountSelector
              columnCount={memoColumnCount}
              onColumnCountChange={setMemoColumnCount}
            />
          </div>
        </div>

        {/* タスク設定 */}
        <div className="mt-4">
          <div className="flex items-center gap-2 mb-2">
            <TaskIcon className="w-5 h-5 mt-0.5" />
            <h2 className="text-lg font-semibold text-gray-800">タスク設定</h2>
          </div>

          {/* タスクのコントロール */}
          <div className="flex items-center gap-2">
            <ViewModeToggle
              viewMode={taskViewMode}
              onViewModeChange={setTaskViewMode}
            />
            <ColumnCountSelector
              columnCount={taskColumnCount}
              onColumnCountChange={setTaskColumnCount}
            />
          </div>
        </div>

        {/* 保存ボタン */}
        <div className="border-t border-gray-200 mt-6">
          <button
            onClick={handleSave}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
          >
            設定を保存
          </button>
        </div>
      </div>
    </div>
  );
}

export default SettingsScreen;
