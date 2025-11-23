"use client";

import TagIcon from "@/components/icons/tag-icon";
import Tooltip from "@/components/ui/base/tooltip";
import { TAG_COLORS } from "@/src/constants/colors";
import { useItemTags } from "@/src/hooks/use-taggings";
import type { Tag } from "@/src/types/tag";

interface TagTriggerButtonProps {
  onClick?: () => void;
  tags?: Tag[];
  targetType?: "memo" | "task" | "board";
  targetDisplayId?: string;
  size?: "sm" | "md";
  disabled?: boolean;
  teamMode?: boolean;
}

export default function TagTriggerButton({
  onClick,
  tags: providedTags,
  targetType,
  targetDisplayId,
  size = "md",
  disabled = false,
  teamMode = false,
}: TagTriggerButtonProps) {
  const shouldFetchTags = !providedTags && targetType && targetDisplayId;
  const { tags: fetchedTags } = useItemTags(
    shouldFetchTags ? targetType : "memo",
    shouldFetchTags ? targetDisplayId : "",
    { teamMode, enabled: !teamMode }, // チームモード時は個人用APIを呼ばない
  );

  const tags = providedTags || (shouldFetchTags ? fetchedTags : []);
  const hasTagsData = !shouldFetchTags || fetchedTags;

  const sizeClasses = {
    sm: "size-6",
    md: "size-7",
  };

  const iconSizeClasses = {
    sm: "size-4",
    md: "size-5",
  };

  if (shouldFetchTags && !hasTagsData) {
    return (
      <div
        className={`flex items-center justify-center ${sizeClasses[size]} rounded-md bg-gray-100 animate-pulse`}
      >
        <TagIcon className={`${iconSizeClasses[size]} text-gray-300`} />
      </div>
    );
  }

  const tooltipText = "タグ";

  return (
    <Tooltip text={tooltipText} position="bottom">
      <div
        onClick={disabled ? undefined : onClick}
        className={`flex items-center justify-center ${sizeClasses[size]} rounded-md transition-colors ${
          disabled ? "cursor-not-allowed" : "cursor-pointer"
        } ${
          disabled
            ? "bg-gray-50"
            : tags.length > 0
              ? "hover:opacity-80"
              : "bg-gray-100 hover:bg-gray-200"
        }`}
        style={
          disabled
            ? {}
            : tags.length > 0
              ? { backgroundColor: TAG_COLORS.background }
              : {}
        }
      >
        <TagIcon
          className={iconSizeClasses[size]}
          style={{
            color: disabled
              ? "#9ca3af" // gray-400
              : tags.length > 0
                ? TAG_COLORS.text
                : TAG_COLORS.iconDefault,
          }}
        />
      </div>
    </Tooltip>
  );
}
