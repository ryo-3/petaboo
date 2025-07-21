"use client";

import MemoIcon from "@/components/icons/memo-icon";
import SettingsIcon from "@/components/icons/settings-icon";
import TaskIcon from "@/components/icons/task-icon";
import Switch from "@/components/ui/base/switch";
import ColumnCountSelector from "@/components/ui/layout/column-count-selector";
import ViewModeToggle from "@/components/ui/layout/view-mode-toggle";
import { useUserPreferences } from "@/src/hooks/use-user-preferences";
import { useEffect, useState } from "react";

type SettingsTab = "memo" | "task" | "general";

function SettingsScreen() {
  const { preferences, updatePreferences, isLoading } = useUserPreferences(1);
  const [activeTab, setActiveTab] = useState<SettingsTab>("memo");

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

  const tabItems = [
    { id: "memo" as const, label: "メモ", icon: <MemoIcon className="w-4 h-4 text-Green" /> },
    { id: "task" as const, label: "タスク", icon: <TaskIcon className="w-4 h-4 text-Blue" /> },
    { id: "general" as const, label: "全体", icon: <SettingsIcon className="w-4 h-4 text-gray-600" /> },
  ];

  return (
    <div className="h-screen bg-white">
      {/* ヘッダー */}
      <div className="border-b border-gray-200 px-5 py-3">
        <div className="flex items-center gap-2">
          <SettingsIcon className="w-6 h-6 text-gray-600" />
          <h1 className="text-[22px] font-bold text-gray-800">設定</h1>
        </div>
      </div>

      {/* サイドバーとメインコンテンツ */}
      <div className="flex h-[calc(100vh-80px)]">
        {/* サイドバー */}
        <div className="w-48 border-r border-gray-200 pt-6 pl-5">
          {/* メニュー */}
          <nav className="space-y-1">
            {tabItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                  activeTab === item.id
                    ? "bg-gray-100 text-gray-900 font-medium"
                    : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                {item.icon}
                <span className="text-sm">{item.label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* メインコンテンツ */}
        <div className="flex-1 px-6 pt-6">
          <div className="max-w-lg">
          {activeTab === "memo" && (
            <div>
              <h2 className="text-lg font-semibold text-gray-800 mb-4">メモ設定</h2>
              <div className="space-y-4">
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
          )}

          {activeTab === "task" && (
            <div>
              <h2 className="text-lg font-semibold text-gray-800 mb-4">タスク設定</h2>
              <div className="space-y-4">
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
          )}

          {activeTab === "general" && (
            <div>
              <h2 className="text-lg font-semibold text-gray-800 mb-4">全体設定</h2>
              <div className="space-y-4">
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
          )}

          {/* 保存ボタン */}
          <div className="mt-8">
            <button
              onClick={handleSave}
              className="px-6 py-3 bg-Emerald hover:bg-Emerald-dark text-white rounded-lg transition-colors font-medium"
            >
              設定を保存
            </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SettingsScreen;
