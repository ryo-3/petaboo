"use client";

import type { ReactNode } from "react";

import TrashIcon from "@/components/icons/trash-icon";

interface DesktopUpperProps {
  currentMode: "memo" | "task" | "board";
  activeTab: "normal" | "deleted" | "todo" | "in_progress" | "completed";
  onTabChange: (
    tab: "normal" | "deleted" | "todo" | "in_progress" | "completed",
  ) => void;
  rightPanelMode: "hidden" | "view" | "create";
  marginBottom?: string;
  headerMarginBottom?: string;
  normalCount: number;
  deletedMemosCount?: number;
  deletedTasksCount?: number;
  deletedCount?: number;
  todoCount?: number;
  inProgressCount?: number;
  completedCount?: number;
  teamMode?: boolean;
  hideTabs?: boolean;
}

function DesktopUpper({
  currentMode,
  activeTab,
  onTabChange,
  rightPanelMode,
  marginBottom = "mb-1.5",
  headerMarginBottom = "",
  normalCount,
  deletedMemosCount = 0,
  deletedTasksCount = 0,
  deletedCount = 0,
  todoCount = 0,
  inProgressCount = 0,
  completedCount = 0,
  teamMode = false,
  hideTabs = false,
}: DesktopUpperProps) {
  // タブ設定
  const getTabsConfig = () => {
    if (currentMode === "task") {
      return [
        { id: "todo", label: "未着手", count: todoCount },
        { id: "in_progress", label: "進行中", count: inProgressCount },
        { id: "completed", label: "完了", count: completedCount },
        {
          id: "deleted",
          label: "",
          icon: <TrashIcon className="w-4 h-4" />,
          count: deletedTasksCount,
        },
      ];
    }
    if (currentMode === "board") {
      return [
        { id: "normal", label: "通常", count: normalCount },
        { id: "completed", label: "完了", count: completedCount },
        {
          id: "deleted",
          label: "",
          icon: <TrashIcon className="w-4 h-4" />,
          count: deletedCount || 0,
        },
      ];
    }
    return [
      { id: "normal", label: "通常", count: normalCount },
      {
        id: "deleted",
        label: "",
        icon: <TrashIcon className="w-4 h-4" />,
        count: deletedMemosCount,
      },
    ];
  };

  // タブの色設定
  const getTabColor = (tabId: string) => {
    const colorMap = {
      todo: "bg-zinc-400",
      in_progress: "bg-Blue",
      completed: "bg-Green",
      deleted: "bg-red-600",
      normal: "bg-zinc-500",
    };
    return colorMap[tabId as keyof typeof colorMap] || "bg-gray-500";
  };

  // タブの背景色設定
  const getTabBackgroundClass = (tabId: string, isActive: boolean) => {
    const baseClass = "bg-gray-100";

    if (isActive) {
      const activeColors = {
        todo: "bg-zinc-200",
        in_progress: "bg-blue-100",
        completed: "bg-Green/20",
        deleted: "bg-red-100",
        normal: "bg-gray-200",
      };
      return activeColors[tabId as keyof typeof activeColors] || "bg-gray-100";
    }

    const hoverColors = {
      todo: "hover:bg-zinc-200",
      in_progress: "hover:bg-blue-100",
      completed: "hover:bg-Green/20",
      deleted: "hover:bg-red-100",
      normal: "hover:bg-gray-200",
    };
    return `${baseClass} ${hoverColors[tabId as keyof typeof hoverColors] || "hover:bg-gray-200"}`;
  };

  // タブの内容をレンダリング
  const renderTabContent = (
    tab: { id: string; label: string; count: number; icon?: ReactNode },
    isActive: boolean,
  ) => {
    if (tab.icon) {
      return (
        <>
          {tab.icon}
          <span
            className={`text-xs transition-all overflow-hidden text-right ${
              isActive
                ? "opacity-100 w-9 translate-x-0 px-1.5 ml-1"
                : "opacity-0 w-0 translate-x-2 px-0"
            }`}
          >
            {tab.count}
          </span>
        </>
      );
    }
    return (
      <>
        <div
          className={`w-2.5 h-2.5 rounded-full ${getTabColor(tab.id)}`}
        ></div>
        {!(teamMode && rightPanelMode === "view") && <span>{tab.label}</span>}
        <span
          className={`bg-white/20 text-xs px-1.5 py-0.5 rounded-full text-right ${teamMode ? "" : "w-9"}`}
        >
          {tab.count}
        </span>
      </>
    );
  };

  const tabs = getTabsConfig();

  // ヘッダー部分のJSX
  const headerContent = (
    <div className={`flex justify-between items-center ${headerMarginBottom}`}>
      <div className="flex items-center gap-2">
        {/* タブ（boardモード以外） */}
        {!hideTabs && currentMode !== "board" && (
          <div className="flex items-center gap-2">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              const tabClass = tab.icon
                ? "pl-1.5 pr-1.5 py-1.5 md:pl-2 md:pr-2 md:py-2"
                : "gap-1 md:gap-1.5 px-1.5 py-1 md:px-2 md:py-1.5";

              return (
                <button
                  key={tab.id}
                  onClick={() =>
                    onTabChange(
                      tab.id as
                        | "normal"
                        | "deleted"
                        | "todo"
                        | "in_progress"
                        | "completed",
                    )
                  }
                  className={`flex items-center ${tabClass} rounded-lg font-medium transition-colors text-gray-600 text-[11px] md:text-[13px] ${getTabBackgroundClass(tab.id, isActive)}`}
                >
                  {renderTabContent(tab, isActive)}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div
      className={`fixed md:static top-0 left-0 right-0 z-10 bg-white px-2 md:px-0 ${marginBottom}`}
    >
      {!hideTabs && headerContent}
    </div>
  );
}

export default DesktopUpper;
