"use client";

import { useViewSettings } from "@/src/contexts/view-settings-context";
import { useTags } from "@/src/hooks/use-tags";
import { useTeamContext } from "@/contexts/team-context";
import { useTeamTags } from "@/src/hooks/use-team-tags";

export function TagFilterContent() {
  const { sessionState, updateSessionState } = useViewSettings();
  const { isTeamMode, teamId } = useTeamContext();

  // チームモードに応じてタグ取得
  const { data: personalTags } = useTags();
  const { data: teamTags } = useTeamTags(teamId ?? 0);
  const tags = isTeamMode ? teamTags : personalTags;

  const handleModeChange = (mode: "include" | "exclude") => {
    updateSessionState({ tagFilterMode: mode });
  };

  const handleTagToggle = (tagId: number) => {
    const newSelectedTagIds = sessionState.selectedTagIds.includes(tagId)
      ? sessionState.selectedTagIds.filter((id) => id !== tagId)
      : [...sessionState.selectedTagIds, tagId];

    updateSessionState({ selectedTagIds: newSelectedTagIds });
  };

  return (
    <div className="space-y-4">
      {/* モード選択 */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700">
          フィルターモード
        </label>
        <div className="flex gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="tagFilterMode"
              value="include"
              checked={sessionState.tagFilterMode === "include"}
              onChange={() => handleModeChange("include")}
              className="w-4 h-4 text-blue-500"
            />
            <span className="text-sm">含む</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="tagFilterMode"
              value="exclude"
              checked={sessionState.tagFilterMode === "exclude"}
              onChange={() => handleModeChange("exclude")}
              className="w-4 h-4 text-blue-500"
            />
            <span className="text-sm">除外</span>
          </label>
        </div>
      </div>

      {/* タグ一覧 */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700">タグ選択</label>
        {!tags || tags.length === 0 ? (
          <p className="text-sm text-gray-500">タグがありません</p>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {tags.map((tag) => (
              <label
                key={tag.id}
                className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={sessionState.selectedTagIds.includes(tag.id)}
                  onChange={() => handleTagToggle(tag.id)}
                  className="w-4 h-4 text-blue-500 rounded"
                />
                <span className="text-sm">{tag.name}</span>
              </label>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
