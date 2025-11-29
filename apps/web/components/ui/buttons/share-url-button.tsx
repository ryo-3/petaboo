"use client";

import LinkIcon from "@/components/icons/link-icon";
import Tooltip from "@/components/ui/base/tooltip";
import { useState } from "react";

interface ShareUrlButtonProps {
  url: string;
  className?: string;
  label?: string;
}

function ShareUrlButton({
  url,
  className = "",
  label = "URLをコピーして共有",
}: ShareUrlButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy URL:", error);
    }
  };

  return (
    <Tooltip text={copied ? "コピーしました！" : label}>
      <button
        onClick={handleCopy}
        className={`
          flex items-center justify-center size-7 rounded-md
          bg-gray-100 text-gray-600 hover:text-gray-800
          hover:bg-gray-200 transition-colors
          ${className}
        `}
      >
        <LinkIcon className="w-4 h-4" />
      </button>
    </Tooltip>
  );
}

export default ShareUrlButton;
