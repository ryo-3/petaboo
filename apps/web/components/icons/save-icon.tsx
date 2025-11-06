import { BaseIconProps } from "@/src/types/icon";

function SaveIcon({ className = "w-6 h-6" }: BaseIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path
        d="M5 3h10.586a2 2 0 0 1 1.414.586L20.414 6a2 2 0 0 1 .586 1.414V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"
        fill="none"
      />
      <path d="M7 3v5h10" />
      <path d="M17 21v-8H7v8" />
      <path d="M9 13h6" />
    </svg>
  );
}

export default SaveIcon;
