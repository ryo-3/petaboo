"use client";

import TagIcon from "@/components/icons/tag-icon";
import Tooltip from "@/components/ui/base/tooltip";
import { TAG_COLORS } from "@/src/constants/colors";

interface TagDisplayToggleProps {
  showTags: boolean;
  onToggle: (show: boolean) => void;
  buttonSize?: string;
  iconSize?: string;
}

export default function TagDisplayToggle({
  showTags,
  onToggle,
  buttonSize = "size-7",
  iconSize = "size-4",
}: TagDisplayToggleProps) {
  return (
    <Tooltip text={showTags ? "タグを非表示" : "タグを表示"} position="bottom">
      <button
        onClick={() => onToggle(!showTags)}
        className={`shadow-sm rounded-lg ${buttonSize} flex items-center justify-center transition-all ${
          showTags ? "hover:opacity-80" : "bg-gray-100 hover:bg-gray-200"
        }`}
        style={showTags ? { backgroundColor: TAG_COLORS.background } : {}}
      >
        <TagIcon
          className={iconSize}
          style={{
            color: showTags ? TAG_COLORS.text : TAG_COLORS.iconDefault,
          }}
        />
      </button>
    </Tooltip>
  );
}
