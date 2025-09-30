"use client";

import { useState, useMemo } from "react";
import Modal from "@/components/ui/modals/modal";
import SearchIcon from "@/components/icons/search-icon";

interface BoardOption {
  id: number;
  name: string;
  isCurrentBoard?: boolean; // 現在のボード（グレーアウト用）
}

interface BoardSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  boards: BoardOption[];
  selectedBoardIds: number[];
  onSelectionChange: (boardIds: number[]) => void;
  mode?: "selection" | "filter";
  multiple?: boolean;
  title?: string;
  // フィルターモード関連（filter時のみ使用）
  filterMode?: "include" | "exclude";
  onFilterModeChange?: (mode: "include" | "exclude") => void;
  // カスタムフッター
  footer?: React.ReactNode;
}

export default function BoardSelectionModal({
  isOpen,
  onClose,
  boards,
  selectedBoardIds,
  onSelectionChange,
  mode = "selection",
  multiple = true,
  title,
  filterMode = "include",
  onFilterModeChange,
  footer,
}: BoardSelectionModalProps) {
  const modalTitle =
    title || (mode === "filter" ? "ボード絞り込み" : "ボード選択");
  const [searchQuery, setSearchQuery] = useState("");

  // 検索でフィルタリング
  const filteredBoards = useMemo(() => {
    if (!searchQuery) return boards;

    const query = searchQuery.toLowerCase();
    return boards.filter((board) => board.name.toLowerCase().includes(query));
  }, [boards, searchQuery]);

  // フィルタリングされたボードをそのまま使用（並び順は変更しない）
  const displayBoards = filteredBoards;

  const handleBoardToggle = (boardId: number) => {
    // 現在のボード（グレーアウト）は選択不可
    const board = boards.find((b) => b.id === boardId);
    if (board?.isCurrentBoard) {
      return;
    }

    if (selectedBoardIds.includes(boardId)) {
      const newIds = selectedBoardIds.filter((id) => id !== boardId);
      onSelectionChange(newIds);
    } else {
      if (multiple) {
        const newIds = [...selectedBoardIds, boardId];
        onSelectionChange(newIds);
      } else {
        onSelectionChange([boardId]);
        onClose();
      }
    }
  };

  const handleSelectAll = () => {
    onSelectionChange(boards.map((board) => board.id));
  };

  const handleClearAll = () => {
    onSelectionChange([]);
  };

  // 選択済みボード一覧（上部に表示用）
  const selectedBoards = useMemo(() => {
    return boards.filter((board) => selectedBoardIds.includes(board.id));
  }, [boards, selectedBoardIds]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="3xl" maxHeight="85vh">
      <div className="min-h-[75vh] max-h-[75vh] flex flex-col">
        {/* カスタムヘッダー：タイトルと検索ボックス */}
        <div className="flex items-center justify-between gap-4 mb-2">
          <h2 className="text-lg font-semibold text-gray-900">{modalTitle}</h2>
          <div className="relative flex-1 max-w-sm">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ボードを検索..."
              className="w-full px-9 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
            />
            <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 size-4 text-gray-400" />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <svg
                  className="size-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* フィルターモード切り替え（filter時のみ） */}
        {mode === "filter" && onFilterModeChange && (
          <div className="mb-3">
            <div className="flex rounded-md bg-gray-100 p-0.5">
              <button
                onClick={() => onFilterModeChange("include")}
                className={`flex-1 px-3 py-1 text-sm font-medium rounded transition-all flex items-center justify-center gap-1 ${
                  filterMode === "include"
                    ? "bg-light-Blue text-white shadow-sm"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                }`}
              >
                <svg
                  className={`w-4 h-4 text-white transition-opacity duration-300 ${
                    filterMode === "include" ? "opacity-100" : "opacity-0"
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={3}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                <span>含む</span>
              </button>
              <button
                onClick={() => onFilterModeChange("exclude")}
                className={`flex-1 px-3 py-1 text-sm font-medium rounded transition-all flex items-center justify-center gap-1 ${
                  filterMode === "exclude"
                    ? "bg-red-500 text-white shadow-sm"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                }`}
              >
                <svg
                  className={`w-4 h-4 text-white transition-opacity duration-300 ${
                    filterMode === "exclude" ? "opacity-100" : "opacity-0"
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={3}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                <span>除く</span>
              </button>
            </div>
          </div>
        )}

        {/* 選択済みボード表示エリア */}
        {selectedBoards.length > 0 && (
          <div className="mb-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">
                選択中のボード
              </span>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">
                  {selectedBoards.length}件
                </span>
                {mode === "filter" && (
                  <button
                    onClick={handleClearAll}
                    className="px-2 py-0.5 text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 rounded transition-colors"
                  >
                    全解除
                  </button>
                )}
              </div>
            </div>
            <div className="flex flex-wrap gap-1">
              {selectedBoards.map((board) => (
                <div
                  key={board.id}
                  className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium cursor-pointer hover:opacity-80 bg-light-Blue text-white"
                  onClick={() => handleBoardToggle(board.id)}
                >
                  <span>{board.name}</span>
                  <svg
                    className="w-3 h-3 ml-1"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ボード一覧ヘッダー */}
        {multiple && (
          <div className="mb-2 flex justify-between items-center">
            <span className="text-sm font-medium text-gray-700">
              ボード一覧
            </span>
          </div>
        )}

        {/* ボード一覧 */}
        <div className="flex-1 min-h-0 overflow-y-auto border border-gray-200 rounded-md">
          {displayBoards.length === 0 ? (
            <p className="text-sm text-gray-500 p-4 text-center">
              {searchQuery
                ? `「${searchQuery}」に一致するボードがありません`
                : "ボードがありません"}
            </p>
          ) : (
            <div className="p-2 space-y-1">
              {displayBoards.map((board) => {
                const isSelected = selectedBoardIds.includes(board.id);
                const isDisabled = board.isCurrentBoard;

                return (
                  <div key={board.id}>
                    <label
                      className={`flex items-center gap-3 py-1 px-2 rounded ${
                        isDisabled
                          ? "cursor-not-allowed opacity-70"
                          : "cursor-pointer hover:bg-gray-50"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleBoardToggle(board.id)}
                        disabled={isDisabled}
                        className="sr-only"
                      />
                      <div
                        className={`w-4 h-4 border rounded flex items-center justify-center flex-shrink-0 ${
                          isSelected
                            ? "bg-light-Blue border-light-Blue"
                            : "border-gray-300 bg-white"
                        }`}
                      >
                        {isSelected && (
                          <svg
                            className="w-3 h-3 text-white"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={3}
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                        )}
                      </div>
                      <span
                        className={`text-sm flex-1 break-words ${
                          isDisabled ? "text-gray-400" : "text-gray-700"
                        }`}
                      >
                        {board.name}
                        {isDisabled && (
                          <span className="ml-2 text-xs text-gray-400">
                            (現在のボード)
                          </span>
                        )}
                      </span>
                    </label>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* カスタムフッター */}
        {footer && <div className="pt-4">{footer}</div>}
      </div>
    </Modal>
  );
}
