"use client";

import { useViewSettings } from "@/src/contexts/view-settings-context";
import { TagFilterContent } from "./tag-filter-content";
import { BoardFilterContent } from "./board-filter-content";

export function UnifiedFilterModal() {
  const {
    sessionState,
    updateSessionState,
    closeFilterModal,
    clearCurrentFilter,
  } = useViewSettings();

  if (!sessionState.filterModalOpen) return null;

  const handleClear = () => {
    clearCurrentFilter();
  };

  const handleClose = () => {
    closeFilterModal();
  };

  const handleTabChange = (tab: "tag" | "board") => {
    updateSessionState({ activeFilterTab: tab });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[80vh] overflow-hidden flex flex-col">
        {/* ヘッダー */}
        <div className="p-4 border-b">
          <h2 className="text-lg font-semibold">フィルター設定</h2>
        </div>

        {/* タブ */}
        <div className="flex border-b">
          <button
            onClick={() => handleTabChange("tag")}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              sessionState.activeFilterTab === "tag"
                ? "border-b-2 border-blue-500 text-blue-600"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            タグ
          </button>
          <button
            onClick={() => handleTabChange("board")}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              sessionState.activeFilterTab === "board"
                ? "border-b-2 border-blue-500 text-blue-600"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            ボード
          </button>
        </div>

        {/* コンテンツエリア */}
        <div className="flex-1 overflow-y-auto p-4">
          {sessionState.activeFilterTab === "tag" ? (
            <TagFilterContent />
          ) : (
            <BoardFilterContent />
          )}
        </div>

        {/* フッター */}
        <div className="p-4 border-t flex gap-2 justify-end">
          <button
            onClick={handleClear}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors"
          >
            クリア
          </button>
          <button
            onClick={handleClose}
            className="px-4 py-2 text-sm bg-blue-500 text-white hover:bg-blue-600 rounded transition-colors"
          >
            適用して閉じる
          </button>
        </div>
      </div>
    </div>
  );
}
