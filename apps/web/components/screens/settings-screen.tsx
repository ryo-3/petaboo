"use client";

import SettingsIcon from "@/components/icons/settings-icon";
import BoardCategoryManager from "@/components/features/board-categories/board-category-manager";

function SettingsScreen() {
  return (
    <div className="bg-white flex flex-col overflow-hidden h-full">
      {/* ヘッダー */}
      <div className="border-b border-gray-200 px-5 py-3">
        <div className="flex items-center gap-2">
          <SettingsIcon className="w-6 h-6 text-gray-600" />
          <h1 className="text-[22px] font-bold text-gray-800">設定</h1>
          <span className="text-sm text-gray-600 ml-4">
            各ページの基本設定ができます
          </span>
        </div>
      </div>

      {/* メインコンテンツ */}
      <div className="flex-1 px-6 pt-4 overflow-hidden">
        <BoardCategoryManager />
      </div>
    </div>
  );
}

export default SettingsScreen;
