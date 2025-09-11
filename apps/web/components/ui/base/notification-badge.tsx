"use client";

import React from "react";

interface NotificationBadgeProps {
  count: number;
  maxCount?: number;
  size?: "sm" | "md";
  className?: string;
}

function NotificationBadge({
  count,
  maxCount = 99,
  size = "md",
  className = "",
}: NotificationBadgeProps) {
  if (count <= 0) {
    return null;
  }

  const displayCount = count > maxCount ? `${maxCount}+` : count.toString();

  const sizeClasses = {
    sm: "w-4 h-4 text-[10px]",
    md: "w-5 h-5 text-xs",
  };

  return (
    <span
      className={`
        absolute -top-1 -right-1 
        bg-red-500 text-white 
        rounded-full 
        flex items-center justify-center 
        font-medium
        ${sizeClasses[size]}
        ${className}
      `}
    >
      {displayCount}
    </span>
  );
}

export default NotificationBadge;
