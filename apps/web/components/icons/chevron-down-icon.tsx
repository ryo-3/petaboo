import React from "react";
import { BaseIconProps } from "@/src/types/icon";

function ChevronDownIcon({ className = "w-4 h-4" }: BaseIconProps) {
  return (
    <svg className={className} viewBox="0 0 12 12" fill="currentColor">
      <path d="M6 8L2 4h8l-4 4z" />
    </svg>
  );
}

export default ChevronDownIcon;
