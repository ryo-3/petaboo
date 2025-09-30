import { BaseIconProps } from "@/src/types/icon";

interface TagIconProps extends BaseIconProps {
  style?: React.CSSProperties;
}

function TagIcon({ className = "w-4 h-4", style }: TagIconProps) {
  return (
    <svg
      className={className}
      style={style}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* タグの本体 */}
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
      />
      {/* 穴（大きめの円） */}
      <circle cx="8" cy="8" r="2" fill="currentColor" stroke="none" />
      {/* 穴の中の白い部分（穴あき効果） */}
      <circle cx="8" cy="8" r="1.2" fill="white" stroke="none" />
    </svg>
  );
}

export default TagIcon;
