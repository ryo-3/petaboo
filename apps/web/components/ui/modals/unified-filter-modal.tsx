"use client";

import { useState } from "react";
import { useViewSettings } from "@/src/contexts/view-settings-context";
import { useTags } from "@/src/hooks/use-tags";
import { useTeamTags } from "@/src/hooks/use-team-tags";
import { useBoards } from "@/src/hooks/use-boards";
import { useTeamBoards } from "@/src/hooks/use-team-boards";
import Modal from "@/components/ui/modals/modal";
import SearchIcon from "@/components/icons/search-icon";
import PlusIcon from "@/components/icons/plus-icon";
import PenIcon from "@/components/icons/pen-icon";
import TagEditModal from "@/components/ui/modals/tag-edit-modal";
import { TAG_COLORS } from "@/src/constants/colors";
import { useCreateTag } from "@/src/hooks/use-tags";
import type { Tag } from "@/src/types/tag";

interface UnifiedFilterModalProps {
  currentBoardId?: number; // 現在のボード（除外用）
  topOffset?: number;
}

export default function UnifiedFilterModal({
  currentBoardId,
  topOffset = 0,
}: UnifiedFilterModalProps) {
  const {
    sessionState,
    updateSessionState,
    closeFilterModal,
    clearCurrentFilter,
    teamMode,
    teamId,
  } = useViewSettings();

  // データ取得（チームモード対応）
  const { data: personalTags = [] } = useTags({ enabled: !teamMode });
  const { data: teamTagsData = [] } = useTeamTags(teamId ?? 0, {
    enabled: teamMode,
  });
  const tags = teamMode ? teamTagsData : personalTags;

  const { data: personalBoards = [] } = useBoards("normal", !teamMode);
  const { data: teamBoardsData = [] } = useTeamBoards(teamId || null, "normal");
  const boards = teamMode ? teamBoardsData : personalBoards;

  // デバッグログ
  // console.log("🔍 UnifiedFilterModal - データ取得状況:", {
  //   teamMode,
  //   teamId,
  //   personalTags: personalTags?.length,
  //   teamTagsData: teamTagsData?.length,
  //   tags: tags?.length,
  //   personalBoards: personalBoards?.length,
  //   teamBoardsData: teamBoardsData?.length,
  //   boards: boards?.length,
  // });

  // ローカルstate
  const [searchQuery, setSearchQuery] = useState("");
  const [colorFilter, setColorFilter] = useState<string | null>(null);
  const [newTagName, setNewTagName] = useState("");
  const [newTagColor, setNewTagColor] = useState<string>(TAG_COLORS.background);
  const [isCreating, setIsCreating] = useState(false);
  const [editingTag, setEditingTag] = useState<Tag | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const createTagMutation = useCreateTag();

  const activeTab = sessionState.activeFilterTab;

  // フィルタリング
  const filteredTags = tags.filter((tag) => {
    if (
      searchQuery &&
      !tag.name.toLowerCase().includes(searchQuery.toLowerCase())
    ) {
      return false;
    }
    if (colorFilter && (tag.color || TAG_COLORS.background) !== colorFilter) {
      return false;
    }
    return true;
  });

  const filteredBoards = boards
    .filter((board) => board.id !== currentBoardId) // 現在のボードを除外
    .filter((board) => {
      if (
        searchQuery &&
        !board.name.toLowerCase().includes(searchQuery.toLowerCase())
      ) {
        return false;
      }
      return true;
    });

  // タグ選択トグル
  const handleTagToggle = (tagId: number) => {
    const newSelection = sessionState.selectedTagIds.includes(tagId)
      ? sessionState.selectedTagIds.filter((id) => id !== tagId)
      : [...sessionState.selectedTagIds, tagId];
    updateSessionState({ selectedTagIds: newSelection });
  };

  // ボード選択トグル
  const handleBoardToggle = (boardId: number) => {
    const newSelection = sessionState.selectedBoardIds.includes(boardId)
      ? sessionState.selectedBoardIds.filter((id) => id !== boardId)
      : [...sessionState.selectedBoardIds, boardId];
    // console.log("📋 ボードフィルター更新:", { boardId, newSelection });
    updateSessionState({ selectedBoardIds: newSelection });
  };

  // タグ作成
  const handleCreateTag = async () => {
    if (!newTagName.trim()) return;

    const trimmedName = newTagName.trim();
    const isDuplicate = tags.some(
      (tag) => tag.name.toLowerCase() === trimmedName.toLowerCase(),
    );

    if (isDuplicate) return;

    try {
      setIsCreating(true);
      const newTag = await createTagMutation.mutateAsync({
        name: trimmedName,
        color: newTagColor,
      });

      updateSessionState({
        selectedTagIds: [...sessionState.selectedTagIds, newTag.id],
      });

      setNewTagName("");
      setNewTagColor(TAG_COLORS.background);
      setSearchQuery("");

      await new Promise((resolve) => setTimeout(resolve, 500));
    } catch (error: any) {
      console.error("🏷️ タグ作成エラー:", error);
      alert(`タグ作成エラー: ${error?.message || "タグの作成に失敗しました"}`);
    } finally {
      setIsCreating(false);
    }
  };

  // タグ編集
  const handleEditTag = (tag: Tag, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setEditingTag(tag);
    setIsEditModalOpen(true);
  };

  // タグ削除時の処理
  const handleTagDeleted = (tagId: number) => {
    if (sessionState.selectedTagIds.includes(tagId)) {
      updateSessionState({
        selectedTagIds: sessionState.selectedTagIds.filter(
          (id) => id !== tagId,
        ),
      });
    }
  };

  const isDuplicateTagName =
    newTagName.trim() !== "" &&
    tags.some(
      (tag) => tag.name.toLowerCase() === newTagName.trim().toLowerCase(),
    );

  const selectedTags = tags.filter((tag) =>
    sessionState.selectedTagIds.includes(tag.id),
  );
  const selectedBoards = boards.filter((board) =>
    sessionState.selectedBoardIds.includes(board.id),
  );

  return (
    <>
      <Modal
        isOpen={sessionState.filterModalOpen}
        onClose={closeFilterModal}
        maxWidth="3xl"
        maxHeight="85vh"
        topOffset={topOffset}
      >
        <div className="min-h-[75vh] max-h-[75vh] flex flex-col">
          {/* ヘッダー：タブ + 検索 + 閉じる */}
          <div className="flex items-center gap-4 mb-2">
            {/* タブ */}
            <div className="flex gap-2">
              <button
                onClick={() => updateSessionState({ activeFilterTab: "tag" })}
                className={`px-4 py-1.5 text-sm font-medium transition-colors border-b-2 ${
                  activeTab === "tag"
                    ? "text-gray-900 border-[#ccb79e]"
                    : "text-gray-600 hover:text-gray-900 border-transparent"
                }`}
              >
                タグ絞り込み
              </button>
              <button
                onClick={() => updateSessionState({ activeFilterTab: "board" })}
                className={`px-4 py-1.5 text-sm font-medium transition-colors border-b-2 ${
                  activeTab === "board"
                    ? "text-gray-900 border-light-Blue"
                    : "text-gray-600 hover:text-gray-900 border-transparent"
                }`}
              >
                ボード絞り込み
              </button>
            </div>

            <div className="flex-1"></div>

            {/* 検索 */}
            <div className="relative w-80">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={
                  activeTab === "tag" ? "タグを検索..." : "ボードを検索..."
                }
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

            {/* 閉じるボタン */}
            <button
              onClick={closeFilterModal}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg
                className="w-6 h-6"
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
          </div>

          {/* タグタブの内容 */}
          {activeTab === "tag" && (
            <>
              {/* 新規タグ作成 */}
              <div className="mt-1 space-y-3">
                <div className="flex gap-2">
                  <div className="flex-1 relative">
                    <input
                      type="text"
                      value={newTagName}
                      onChange={(e) => setNewTagName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !isCreating) {
                          e.preventDefault();
                          handleCreateTag();
                        }
                      }}
                      placeholder="新しいタグ名を入力..."
                      className={`w-full px-3 py-2 pr-12 border rounded-md text-sm focus:outline-none ${
                        newTagName.length > 50 || isDuplicateTagName
                          ? "border-red-400 ring-1 ring-red-400 focus:ring-red-400 focus:border-red-400"
                          : "border-gray-200 focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
                      }`}
                    />
                    <div
                      className={`absolute right-3 top-1/2 transform -translate-y-1/2 text-xs ${newTagName.length > 50 || isDuplicateTagName ? "text-red-500" : "text-gray-500"}`}
                    >
                      {isDuplicateTagName ? "重複" : `${newTagName.length}/50`}
                    </div>
                  </div>
                  <button
                    onClick={handleCreateTag}
                    disabled={
                      !newTagName.trim() ||
                      isCreating ||
                      isDuplicateTagName ||
                      newTagName.length > 50
                    }
                    className="w-20 py-2 bg-Green text-white rounded-md text-sm font-medium hover:bg-Green/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1"
                  >
                    {!isCreating && <PlusIcon className="size-4" />}
                    {isCreating ? "作成中..." : "作成"}
                  </button>
                </div>

                {/* カラー選択 */}
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">カラー</span>
                  <div className="flex gap-1.5">
                    {[
                      { name: "デフォルト", color: TAG_COLORS.background },
                      { name: "ブルー", color: "#dbeafe" },
                      { name: "グリーン", color: "#dcfce7" },
                      { name: "イエロー", color: "#fef3c7" },
                      { name: "レッド", color: "#fee2e2" },
                      { name: "パープル", color: "#f3e8ff" },
                      { name: "ピンク", color: "#fce7f3" },
                      { name: "グレー", color: "#f3f4f6" },
                    ].map(({ name, color }) => (
                      <button
                        key={name}
                        onClick={() => setNewTagColor(color)}
                        className={`w-6 h-6 rounded-full border-2 ${
                          newTagColor === color
                            ? "border-gray-900"
                            : "border-gray-300"
                        }`}
                        style={{ backgroundColor: color }}
                        title={name}
                      />
                    ))}
                  </div>
                  {/* プレビュー */}
                  <div className="ml-2 h-6 flex items-center">
                    {newTagName.trim() && !isDuplicateTagName && (
                      <span
                        className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium"
                        style={{
                          backgroundColor: newTagColor,
                          color: TAG_COLORS.text,
                        }}
                      >
                        {newTagName.trim()}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* フィルターモード切り替え */}
              <div className="mt-3">
                <div className="flex rounded-md bg-gray-100 p-0.5">
                  <button
                    onClick={() =>
                      updateSessionState({ tagFilterMode: "include" })
                    }
                    className={`flex-1 px-3 py-1 text-sm font-medium rounded transition-colors duration-200 flex items-center justify-center gap-1 ${
                      sessionState.tagFilterMode === "include"
                        ? "bg-tag-bg text-tag-text shadow-sm"
                        : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                    }`}
                  >
                    <svg
                      className={`w-4 h-4 text-tag-text transition-opacity duration-300 ${
                        sessionState.tagFilterMode === "include"
                          ? "opacity-100"
                          : "opacity-0"
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
                    onClick={() =>
                      updateSessionState({ tagFilterMode: "exclude" })
                    }
                    className={`flex-1 px-3 py-1 text-sm font-medium rounded transition-all flex items-center justify-center gap-1 ${
                      sessionState.tagFilterMode === "exclude"
                        ? "bg-red-500 text-white shadow-sm"
                        : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                    }`}
                  >
                    <svg
                      className={`w-4 h-4 text-white transition-opacity duration-300 ${
                        sessionState.tagFilterMode === "exclude"
                          ? "opacity-100"
                          : "opacity-0"
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

              {/* 選択済みタグ表示 */}
              {selectedTags.length > 0 && (
                <div className="mt-3 mb-2">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">
                      選択中のタグ
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-500">
                        {selectedTags.length}件
                      </span>
                      <button
                        onClick={clearCurrentFilter}
                        className="px-2 py-0.5 text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 rounded transition-colors"
                      >
                        全解除
                      </button>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {selectedTags.map((tag) => (
                      <div
                        key={tag.id}
                        className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium cursor-pointer hover:opacity-80"
                        style={{
                          backgroundColor: tag.color || TAG_COLORS.background,
                          color: TAG_COLORS.text,
                        }}
                        onClick={() => handleTagToggle(tag.id)}
                      >
                        <span>{tag.name}</span>
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

              {/* タグ一覧ヘッダー */}
              <div className="mt-2 mb-2 flex justify-between items-center">
                <span className="text-sm font-medium text-gray-700">
                  タグ一覧
                </span>
                {/* カラーフィルター */}
                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-600">
                    カラーフィルター
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setColorFilter(null)}
                      className={`px-2 py-1 text-xs rounded ${
                        colorFilter === null
                          ? "bg-gray-200 text-gray-800"
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      }`}
                    >
                      全色
                    </button>
                    {[
                      { name: "デフォルト", color: TAG_COLORS.background },
                      { name: "ブルー", color: "#dbeafe" },
                      { name: "グリーン", color: "#dcfce7" },
                      { name: "イエロー", color: "#fef3c7" },
                      { name: "レッド", color: "#fee2e2" },
                      { name: "パープル", color: "#f3e8ff" },
                      { name: "ピンク", color: "#fce7f3" },
                      { name: "グレー", color: "#f3f4f6" },
                    ].map(({ name, color }) => (
                      <button
                        key={name}
                        onClick={() => setColorFilter(color)}
                        className={`w-6 h-6 rounded-full border-2 ${
                          colorFilter === color
                            ? "border-gray-900"
                            : "border-gray-300"
                        }`}
                        style={{ backgroundColor: color }}
                        title={`${name}でフィルター`}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* タグ一覧 */}
              <div className="mt-1 flex-1 min-h-0 overflow-y-auto border border-gray-200 rounded-md">
                {filteredTags.length === 0 ? (
                  <p className="text-sm text-gray-500 p-4 text-center">
                    {searchQuery
                      ? `「${searchQuery}」に一致するタグがありません`
                      : "タグがありません"}
                  </p>
                ) : (
                  <div className="p-2 space-y-1">
                    {filteredTags.map((tag) => (
                      <div key={tag.id}>
                        <div className="flex items-center gap-2 py-1 px-2 hover:bg-gray-50 rounded group">
                          <label className="flex items-center gap-2 flex-1 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={sessionState.selectedTagIds.includes(
                                tag.id,
                              )}
                              onChange={() => handleTagToggle(tag.id)}
                              className="sr-only"
                            />
                            <div
                              className={`w-4 h-4 border rounded flex items-center justify-center flex-shrink-0 ${
                                sessionState.selectedTagIds.includes(tag.id)
                                  ? "border-gray-400 bg-gray-200"
                                  : "border-gray-300 bg-white"
                              }`}
                            >
                              {sessionState.selectedTagIds.includes(tag.id) && (
                                <svg
                                  className="w-3 h-3 text-black"
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
                              className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium"
                              style={{
                                backgroundColor:
                                  tag.color || TAG_COLORS.background,
                                color: TAG_COLORS.text,
                              }}
                            >
                              {tag.name}
                            </span>
                            <div className="flex-1"></div>
                          </label>
                          {/* 編集ボタン */}
                          <button
                            onClick={(e) => handleEditTag(tag, e)}
                            className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-200 rounded transition-opacity"
                          >
                            <PenIcon className="size-3 text-gray-500" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          {/* ボードタブの内容 */}
          {activeTab === "board" && (
            <>
              {/* フィルターモード切り替え */}
              <div className="mb-3">
                <div className="flex rounded-md bg-gray-100 p-0.5">
                  <button
                    onClick={() =>
                      updateSessionState({ boardFilterMode: "include" })
                    }
                    className={`flex-1 px-3 py-1 text-sm font-medium rounded transition-all flex items-center justify-center gap-1 ${
                      sessionState.boardFilterMode === "include"
                        ? "bg-light-Blue text-white shadow-sm"
                        : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                    }`}
                  >
                    <svg
                      className={`w-4 h-4 text-white transition-opacity duration-300 ${
                        sessionState.boardFilterMode === "include"
                          ? "opacity-100"
                          : "opacity-0"
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
                    onClick={() =>
                      updateSessionState({ boardFilterMode: "exclude" })
                    }
                    className={`flex-1 px-3 py-1 text-sm font-medium rounded transition-all flex items-center justify-center gap-1 ${
                      sessionState.boardFilterMode === "exclude"
                        ? "bg-red-500 text-white shadow-sm"
                        : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                    }`}
                  >
                    <svg
                      className={`w-4 h-4 text-white transition-opacity duration-300 ${
                        sessionState.boardFilterMode === "exclude"
                          ? "opacity-100"
                          : "opacity-0"
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

              {/* 選択済みボード表示 */}
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
                      <button
                        onClick={clearCurrentFilter}
                        className="px-2 py-0.5 text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 rounded transition-colors"
                      >
                        全解除
                      </button>
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
              <div className="mb-2 flex justify-between items-center">
                <span className="text-sm font-medium text-gray-700">
                  ボード一覧
                </span>
              </div>

              {/* ボード一覧 */}
              <div className="flex-1 min-h-0 overflow-y-auto border border-gray-200 rounded-md">
                {filteredBoards.length === 0 ? (
                  <p className="text-sm text-gray-500 p-4 text-center">
                    {searchQuery
                      ? `「${searchQuery}」に一致するボードがありません`
                      : "ボードがありません"}
                  </p>
                ) : (
                  <div className="p-2 space-y-1">
                    {filteredBoards.map((board) => {
                      const isSelected = sessionState.selectedBoardIds.includes(
                        board.id,
                      );
                      return (
                        <div key={board.id}>
                          <label className="flex items-center gap-3 py-1 px-2 rounded cursor-pointer hover:bg-gray-50">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleBoardToggle(board.id)}
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
                            <span className="text-sm flex-1 break-words text-gray-700">
                              {board.name}
                            </span>
                          </label>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </Modal>

      {/* タグ編集モーダル */}
      {editingTag && (
        <TagEditModal
          tag={editingTag}
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setEditingTag(null);
          }}
          onTagUpdated={() => {}}
          onTagDeleted={handleTagDeleted}
        />
      )}
    </>
  );
}
