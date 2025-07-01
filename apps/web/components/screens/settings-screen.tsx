"use client";

import { useUserPreferences } from "@/src/hooks/use-user-preferences";
import { useEffect, useState } from "react";
import MemoIcon from "@/components/icons/memo-icon";
import SettingsIcon from "@/components/icons/settings-icon";
import TaskIcon from "@/components/icons/task-icon";
import ColumnCountSelector from "@/components/ui/layout/column-count-selector";
import Switch from "@/components/ui/base/switch";
import ViewModeToggle from "@/components/ui/layout/view-mode-toggle";

// Removed empty interface - using empty props instead

function SettingsScreen() {
  const { preferences, updatePreferences, isLoading } = useUserPreferences(1);

  const [memoColumnCount, setMemoColumnCount] = useState(4);
  const [taskColumnCount, setTaskColumnCount] = useState(2);
  const [memoViewMode, setMemoViewMode] = useState<"card" | "list">("list");
  const [taskViewMode, setTaskViewMode] = useState<"card" | "list">("list");
  const [memoHideControls, setMemoHideControls] = useState(false);
  const [taskHideControls, setTaskHideControls] = useState(false);

  // 設定を読み込んだらローカル状態を更新
  useEffect(() => {
    if (preferences) {
      setMemoColumnCount(preferences.memoColumnCount);
      setTaskColumnCount(preferences.taskColumnCount);
      setMemoViewMode(preferences.memoViewMode);
      setTaskViewMode(preferences.taskViewMode);
      setMemoHideControls(preferences.memoHideControls);
      setTaskHideControls(preferences.taskHideControls);
    }
  }, [preferences]);

  const handleSave = async () => {
    try {
      await updatePreferences({
        memoColumnCount,
        taskColumnCount,
        memoViewMode,
        taskViewMode,
        memoHideControls,
        taskHideControls,
      });
      alert("設定を保存しました！");
    } catch {
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
            <strong>表示モード:</strong>{" "}
            リスト表示は詳細情報が見やすく、カード表示は視覚的に分かりやすい表示です。
            <br />
            <strong>列数:</strong>{" "}
            列数を調整することで、画面サイズに合わせた最適な表示が可能です。
          </p>
        </div>

        {/* メモ設定 */}
        <div className="mt-4">
          <div className="flex items-center justify-between mb-2 w-64">
            <div className="flex items-center gap-2">
              <MemoIcon className="w-5 h-5 mt-0.5" />
              <h2 className="text-lg font-semibold text-gray-800">メモ設定</h2>
            </div>
            <Switch
              checked={memoHideControls}
              onCheckedChange={setMemoHideControls}
              label="コントロール非表示"
            />
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
          <div className="flex items-center justify-between mb-2 w-64">
            <div className="flex items-center gap-2">
              <TaskIcon className="w-5 h-5 mt-0.5" />
              <h2 className="text-lg font-semibold text-gray-800">
                タスク設定
              </h2>
            </div>
            <Switch
              checked={taskHideControls}
              onCheckedChange={setTaskHideControls}
              label="コントロール非表示"
            />
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
        <div className="mt-6">
          <button
            onClick={handleSave}
            className="px-6 py-3 bg-Emerald hover:bg-Emerald-dark text-white rounded-lg transition-colors font-medium"
          >
            設定を保存
          </button>
        </div>
      </div>
    </div>
  );
}

export default SettingsScreen;
