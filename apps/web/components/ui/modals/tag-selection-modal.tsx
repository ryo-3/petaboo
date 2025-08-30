"use client";

import PenIcon from "@/components/icons/pen-icon";
import PlusIcon from "@/components/icons/plus-icon";
import SearchIcon from "@/components/icons/search-icon";
import Modal from "@/components/ui/modals/modal";
import TagEditModal from "@/components/ui/modals/tag-edit-modal";
import { TAG_COLORS } from "@/src/constants/colors";
import { useCreateTag } from "@/src/hooks/use-tags";
import type { Tag } from "@/src/types/tag";
import { useMemo, useState } from "react";

interface TagOption {
  id: number;
  name: string;
  color?: string;
}

interface TagSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  tags: TagOption[];
  selectedTagIds: number[];
  onSelectionChange: (tagIds: number[]) => void;
  mode?: "selection" | "filter";
  multiple?: boolean;
  title?: string;
  // フィルターモード関連（filter時のみ使用）
  filterMode?: "include" | "exclude";
  onFilterModeChange?: (mode: "include" | "exclude") => void;
  // カスタムフッター
  footer?: React.ReactNode;
}

export default function TagSelectionModal({
  isOpen,
  onClose,
  tags,
  selectedTagIds,
  onSelectionChange,
  mode = "selection",
  multiple = true,
  title,
  filterMode = "include",
  onFilterModeChange,
  footer,
}: TagSelectionModalProps) {
  const modalTitle = title || (mode === "filter" ? "タグ絞り込み" : "タグ選択");
  const [searchQuery, setSearchQuery] = useState("");
  const [colorFilter, setColorFilter] = useState<string | null>(null);
  const [newTagName, setNewTagName] = useState("");
  const [newTagColor, setNewTagColor] = useState<string>(TAG_COLORS.background);
  const [isCreating, setIsCreating] = useState(false);
  const [editingTag, setEditingTag] = useState<Tag | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const createTagMutation = useCreateTag();

  // 検索と色でフィルタリング（並び順は変更しない）
  const filteredTags = useMemo(() => {
    let filtered = tags;

    // 検索フィルタ
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((tag) =>
        tag.name.toLowerCase().includes(query),
      );
    }

    // 色フィルタ
    if (colorFilter) {
      filtered = filtered.filter(
        (tag) => (tag.color || TAG_COLORS.background) === colorFilter,
      );
    }

    return filtered;
  }, [tags, searchQuery, colorFilter]);

  // 選択済みタグ一覧（上部に表示用）
  const selectedTags = useMemo(() => {
    return tags.filter((tag) => selectedTagIds.includes(tag.id));
  }, [tags, selectedTagIds]);

  const handleTagToggle = (tagId: number) => {
    console.log("🏷️ TagModal: タグトグル開始:", {
      tagId,
      currentSelection: selectedTagIds,
      isRemoving: selectedTagIds.includes(tagId),
    });

    if (selectedTagIds.includes(tagId)) {
      const newSelection = selectedTagIds.filter((id) => id !== tagId);
      console.log("🏷️ TagModal: タグ削除→", newSelection);
      onSelectionChange(newSelection);
    } else {
      if (multiple) {
        const newSelection = [...selectedTagIds, tagId];
        console.log("🏷️ TagModal: タグ追加→", newSelection);
        onSelectionChange(newSelection);
      } else {
        console.log("🏷️ TagModal: タグ単体選択→", [tagId]);
        onSelectionChange([tagId]);
        onClose();
      }
    }
  };

  // 新規タグ名のバリデーション
  const isDuplicateTagName =
    newTagName.trim() !== "" &&
    tags.some(
      (tag) => tag.name.toLowerCase() === newTagName.trim().toLowerCase(),
    );

  // 新規タグ作成
  const handleCreateTag = async () => {
    if (!newTagName.trim()) return;

    const trimmedName = newTagName.trim();

    // 事前バリデーション：重複チェック
    const isDuplicate = tags.some(
      (tag) => tag.name.toLowerCase() === trimmedName.toLowerCase(),
    );

    if (isDuplicate) {
      return; // UIで既に表示済みなのでalertは不要
    }

    try {
      setIsCreating(true);
      const newTag = await createTagMutation.mutateAsync({
        name: trimmedName,
        color: newTagColor,
      });

      // 作成したタグを自動選択
      if (multiple) {
        onSelectionChange([...selectedTagIds, newTag.id]);
      } else {
        onSelectionChange([newTag.id]);
      }

      setNewTagName("");
      setNewTagColor(TAG_COLORS.background); // 色もリセット
      setSearchQuery(""); // 検索もクリア

      // 0.5秒遅延
      await new Promise((resolve) => setTimeout(resolve, 500));
    } catch (error) {
      console.error("タグ作成エラー:", error);
    } finally {
      setIsCreating(false);
    }
  };

  // タグ編集ボタンクリック
  const handleEditTag = (tag: TagOption, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // TagOptionをTagに変換（不足プロパティを仮値で設定）
    const fullTag: Tag = {
      ...tag,
      color: tag.color || TAG_COLORS.background,
      userId: "", // 実際の実装では適切なユーザーIDを設定
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    setEditingTag(fullTag);
    setIsEditModalOpen(true);
  };

  // タグ編集モーダルを閉じる
  const handleCloseEditModal = () => {
    setIsEditModalOpen(false);
    setEditingTag(null);
  };

  // タグが更新された時の処理
  const handleTagUpdated = () => {
    // 親コンポーネントでタグ一覧が更新されるので、特に何もしない
    // React Queryのキャッシュ更新により自動的に反映される
  };

  // タグが削除された時の処理
  const handleTagDeleted = (tagId: number) => {
    // 削除されたタグが選択されていた場合は選択を解除
    if (selectedTagIds.includes(tagId)) {
      const updatedSelection = selectedTagIds.filter((id) => id !== tagId);
      onSelectionChange(updatedSelection);
    }
  };

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} maxWidth="3xl" maxHeight="85vh">
        <div className="min-h-[75vh] max-h-[75vh] flex flex-col">
          {/* カスタムヘッダー：タイトルと検索ボックス */}
          <div className="flex items-center justify-between gap-4 mb-2">
            <h2 className="text-lg font-semibold text-gray-900">
              {modalTitle}
            </h2>
            <div className="relative flex-1 max-w-sm">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="タグを検索..."
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
              {/* プレビュー・エラー表示エリア */}
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
          {/* フィルターモード切り替え（filter時のみ） */}
          {mode === "filter" && onFilterModeChange && (
            <div className="mt-3">
              <div className="flex rounded-md bg-gray-100 p-0.5">
                <button
                  onClick={() => onFilterModeChange("include")}
                  className={`flex-1 px-3 py-1 text-sm font-medium rounded transition-colors duration-200 flex items-center justify-center gap-1 ${
                    filterMode === "include"
                      ? "bg-tag-bg text-tag-text shadow-sm"
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                  }`}
                >
                  <svg
                    className={`w-4 h-4 text-tag-text transition-opacity duration-300 ${
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

          {/* 選択済みタグ表示エリア */}
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
                  {mode === "filter" && (
                    <button
                      onClick={() => onSelectionChange([])}
                      className="px-2 py-0.5 text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 rounded transition-colors"
                    >
                      全解除
                    </button>
                  )}
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

          {/* タグ一覧ヘッダー（複数選択時のみ） */}
          {multiple && (
            <div className="mt-2 mb-2 flex justify-between items-center">
              <span className="text-sm font-medium text-gray-700">
                タグ一覧
              </span>
              <div className="flex items-center gap-3">
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
            </div>
          )}

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
                {filteredTags.map((tag) => {
                  return (
                    <div key={tag.id}>
                      <div className="flex items-center gap-2 py-1 px-2 hover:bg-gray-50 rounded group">
                        <label className="flex items-center gap-2 flex-1 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={selectedTagIds.includes(tag.id)}
                            onChange={() => handleTagToggle(tag.id)}
                            className="sr-only"
                          />
                          <div
                            className={`w-4 h-4 border rounded flex items-center justify-center flex-shrink-0 ${
                              selectedTagIds.includes(tag.id)
                                ? "border-gray-400 bg-gray-200"
                                : "border-gray-300 bg-white"
                            }`}
                          >
                            {selectedTagIds.includes(tag.id) && (
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
                  );
                })}
              </div>
            )}
          </div>

          {/* カスタムフッター */}
          {footer && <div className="pt-4">{footer}</div>}
        </div>
      </Modal>

      {/* タグ編集モーダル */}
      {editingTag && (
        <TagEditModal
          tag={editingTag}
          isOpen={isEditModalOpen}
          onClose={handleCloseEditModal}
          onTagUpdated={handleTagUpdated}
          onTagDeleted={handleTagDeleted}
        />
      )}
    </>
  );
}
