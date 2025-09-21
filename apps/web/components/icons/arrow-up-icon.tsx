import { BaseIconProps } from "@/src/types/icon";

function ArrowUpIcon({ className = "w-2.5 h-3" }: BaseIconProps) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M5 10l7-7m0 0l7 7m-7-7v18"
      />
    </svg>
  );
}

export default ArrowUpIcon;
