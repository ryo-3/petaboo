import { BaseIconProps } from "@/src/types/icon";

function DashboardIcon({ className = "w-5 h-5" }: BaseIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2}
      stroke="currentColor"
      className={className}
    >
      <rect
        x="2"
        y="2"
        width="20"
        height="20"
        rx="1"
        fill="currentColor"
        opacity="0.1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <rect
        x="2"
        y="2"
        width="20"
        height="20"
        rx="1"
        fill="none"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <line
        x1="2"
        y1="12"
        x2="22"
        y2="12"
        strokeWidth="1"
        strokeLinecap="round"
      />
      <line
        x1="12"
        y1="2"
        x2="12"
        y2="22"
        strokeWidth="1"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default DashboardIcon;
