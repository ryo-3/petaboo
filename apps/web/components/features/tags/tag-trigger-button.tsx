"use client";

import TagIcon from "@/components/icons/tag-icon";
import Tooltip from "@/components/ui/base/tooltip";
import { TAG_COLORS } from "@/src/constants/colors";
import type { Tag } from "@/src/types/tag";

interface TagTriggerButtonProps {
  onClick: () => void;
  tags: Tag[];
}

export default function TagTriggerButton({
  onClick,
  tags,
}: TagTriggerButtonProps) {
  return (
    <Tooltip text="タグ" position="top">
      <button
        onClick={onClick}
        className={`flex items-center justify-center size-7 rounded-md transition-colors ${
          tags.length > 0 ? "hover:opacity-80" : "bg-gray-100 hover:bg-gray-200"
        }`}
        style={
          tags.length > 0 ? { backgroundColor: TAG_COLORS.background } : {}
        }
      >
        <TagIcon
          className="size-5"
          style={{
            color: tags.length > 0 ? TAG_COLORS.text : TAG_COLORS.iconDefault,
          }}
        />
      </button>
    </Tooltip>
  );
}
