"use client";

import { useMemo } from "react";
import CustomSelector from "@/components/ui/selectors/custom-selector";
import type { TeamMember } from "@/src/hooks/use-team-detail";
import { getUserAvatarColor } from "@/src/utils/userUtils";

interface AssigneeSelectorProps {
  label?: string;
  members: TeamMember[];
  value: string | null;
  onChange: (value: string | null) => void;
  disabled?: boolean;
  compact?: boolean;
  hideLabel?: boolean;
  width?: string;
  placeholder?: string;
  className?: string;
  compactMode?: boolean;
}

function getDisplayName(member: TeamMember): string {
  return member.displayName || `ユーザー${member.userId.slice(-4)}`;
}

export default function AssigneeSelector({
  label = "担当者",
  members,
  value,
  onChange,
  disabled = false,
  compact = false,
  hideLabel = false,
  width = "160px",
  placeholder = "担当者",
  className = "",
  compactMode = false,
}: AssigneeSelectorProps) {
  // CustomSelector用のオプション配列を作成
  const options = useMemo(() => {
    const memberOptions = members.map((member) => {
      const displayName = getDisplayName(member);
      const avatarColor =
        member.avatarColor || getUserAvatarColor(member.userId);
      const initial = displayName.charAt(0).toUpperCase();

      return {
        value: member.userId,
        label: displayName,
        icon: (
          <span
            className={`flex items-center justify-center rounded-full text-white text-xs font-medium size-5 ${avatarColor}`}
          >
            {initial}
          </span>
        ),
      };
    });

    // 「未割り当て」オプションを先頭に追加
    return [
      {
        value: "",
        label: placeholder,
        icon: (
          <span className="flex items-center justify-center rounded-full bg-gray-300 text-white text-xs font-medium size-5">
            ?
          </span>
        ),
      },
      ...memberOptions,
    ];
  }, [members, placeholder]);

  // CustomSelectorは空文字列を受け付けないので、nullの場合は空文字列に変換
  const selectorValue = value || "";

  const handleChange = (newValue: string) => {
    // 空文字列の場合はnullに変換して返す
    onChange(newValue === "" ? null : newValue);
  };

  return (
    <CustomSelector
      label={label}
      options={options}
      value={selectorValue}
      onChange={handleChange}
      width={width}
      disabled={disabled}
      hideLabel={hideLabel}
      compactMode={compactMode}
      hideChevron={true}
    />
  );
}
