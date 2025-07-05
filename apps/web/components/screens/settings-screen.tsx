"use client";

import MemoIcon from "@/components/icons/memo-icon";
import SettingsIcon from "@/components/icons/settings-icon";
import TaskIcon from "@/components/icons/task-icon";
import Switch from "@/components/ui/base/switch";
import ColumnCountSelector from "@/components/ui/layout/column-count-selector";
import ViewModeToggle from "@/components/ui/layout/view-mode-toggle";
import { useUserPreferences } from "@/src/hooks/use-user-preferences";
import { useEffect, useState } from "react";

// Removed empty interface - using empty props instead

function SettingsScreen() {
  const { preferences, updatePreferences, isLoading } = useUserPreferences(1);

  const [memoColumnCount, setMemoColumnCount] = useState(4);
  const [taskColumnCount, setTaskColumnCount] = useState(2);
  const [memoViewMode, setMemoViewMode] = useState<"card" | "list">("list");
  const [taskViewMode, setTaskViewMode] = useState<"card" | "list">("list");
  const [memoHideControls, setMemoHideControls] = useState(false);
  const [taskHideControls, setTaskHideControls] = useState(false);
  const [hideHeader, setHideHeader] = useState(false);

  // 設定を読み込んだらローカル状態を更新
  useEffect(() => {
    if (preferences) {
      setMemoColumnCount(preferences.memoColumnCount);
      setTaskColumnCount(preferences.taskColumnCount);
      setMemoViewMode(preferences.memoViewMode);
      setTaskViewMode(preferences.taskViewMode);
      setMemoHideControls(preferences.memoHideControls);
      setTaskHideControls(preferences.taskHideControls);
      setHideHeader(preferences.hideHeader);
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
        hideHeader,
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
      <div className="mb-6 border-b border-gray-200 pb-4">
        <div className="flex items-center gap-2 mb-2">
          <SettingsIcon className="w-6 h-6 text-gray-600" />
          <h1 className="text-2xl font-bold text-gray-800">設定</h1>
        </div>
        <p className="text-sm text-gray-600 leading-relaxed">
          ここではメモとタスクの表示設定を変更できます。設定は自動的に保存され、次回アクセス時にも適用されます。
        </p>
      </div>

      <div className="max-w-lg">
        {/* メモ設定 */}
        <div className="mt-6">
          <div className="flex items-center gap-2 mb-4">
            <MemoIcon className="w-5 h-5 text-Green" />
            <h2 className="text-lg font-semibold text-gray-800">メモ設定</h2>
          </div>

          <div className="space-y-4 pl-7">
            <div className="flex items-center justify-between py-2 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-gray-700 w-20">
                  表示形式
                </span>
                <ViewModeToggle
                  viewMode={memoViewMode}
                  onViewModeChange={setMemoViewMode}
                  buttonSize="size-7"
                  iconSize="size-4"
                />
              </div>
              <span className="text-sm text-gray-500">
                {memoViewMode === "card" ? "カード表示" : "リスト表示"}
              </span>
            </div>

            <div className="flex items-center justify-between py-2 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-gray-700 w-20">
                  列数
                </span>
                <ColumnCountSelector
                  columnCount={memoColumnCount}
                  onColumnCountChange={setMemoColumnCount}
                  containerHeight="h-7"
                  buttonSize="size-6"
                />
              </div>
              <span className="text-sm text-gray-500">
                {memoColumnCount}列で表示
              </span>
            </div>

            <div className="flex items-center justify-between py-2">
              <span className="text-sm font-medium text-gray-700">
                コントロール表示
              </span>
              <Switch
                checked={!memoHideControls}
                onCheckedChange={(checked) => setMemoHideControls(!checked)}
                label=""
              />
            </div>
          </div>
        </div>

        {/* タスク設定 */}
        <div className="mt-6">
          <div className="flex items-center gap-2 mb-4">
            <TaskIcon className="w-5 h-5 text-Blue" />
            <h2 className="text-lg font-semibold text-gray-800">タスク設定</h2>
          </div>

          <div className="space-y-4 pl-7">
            <div className="flex items-center justify-between py-2 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-gray-700 w-20">
                  表示形式
                </span>
                <ViewModeToggle
                  viewMode={taskViewMode}
                  onViewModeChange={setTaskViewMode}
                  buttonSize="size-7"
                  iconSize="size-4"
                />
              </div>
              <span className="text-sm text-gray-500">
                {taskViewMode === "card" ? "カード表示" : "リスト表示"}
              </span>
            </div>

            <div className="flex items-center justify-between py-2 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-gray-700 w-20">
                  列数
                </span>
                <ColumnCountSelector
                  columnCount={taskColumnCount}
                  onColumnCountChange={setTaskColumnCount}
                  containerHeight="h-7"
                  buttonSize="size-6"
                />
              </div>
              <span className="text-sm text-gray-500">
                {taskColumnCount}列で表示
              </span>
            </div>

            <div className="flex items-center justify-between py-2">
              <span className="text-sm font-medium text-gray-700">
                コントロール表示
              </span>
              <Switch
                checked={!taskHideControls}
                onCheckedChange={(checked) => setTaskHideControls(!checked)}
                label=""
              />
            </div>
          </div>
        </div>

        {/* 全体設定 */}
        <div className="mt-6">
          <div className="flex items-center gap-2 mb-4">
            <SettingsIcon className="w-5 h-5 text-gray-600" />
            <h2 className="text-lg font-semibold text-gray-800">全体設定</h2>
          </div>

          <div className="pl-7">
            <div className="flex items-center justify-between py-2">
              <div>
                <span className="text-sm font-medium text-gray-700">
                  ヘッダーを非表示
                </span>
                <p className="text-xs text-gray-500 mt-1">
                  より広い作業領域を確保
                </p>
              </div>
              <Switch
                checked={hideHeader}
                onCheckedChange={setHideHeader}
                label=""
              />
            </div>
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
