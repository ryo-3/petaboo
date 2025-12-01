"use client";

import CopyIcon from "@/components/icons/copy-icon";
import LinkIcon from "@/components/icons/link-icon";
import Tooltip from "@/components/ui/base/tooltip";
import { useState } from "react";

interface ShareUrlButtonProps {
  url: string;
  title?: string;
  content?: string;
  className?: string;
  label?: string;
}

function ShareUrlButton({
  url,
  title,
  content,
  className = "",
  label = "URLをコピーして共有",
}: ShareUrlButtonProps) {
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedText, setCopiedText] = useState(false);

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    } catch (error) {
      console.error("Failed to copy URL:", error);
    }
  };

  const handleCopyText = async () => {
    try {
      // URLからboard、task、memoパラメータを抽出してBacklog形式を生成
      const urlObj = new URL(url);
      // 新形式: 値が空のキーをボードslugとして扱う（?PETABOO&task=22 形式）
      let boardSlug: string | null = null;
      for (const [key, value] of urlObj.searchParams.entries()) {
        if (
          value === "" &&
          ![
            "boards",
            "memo",
            "task",
            "search",
            "team-list",
            "team-settings",
            "memos",
            "tasks",
          ].includes(key)
        ) {
          boardSlug = key.toUpperCase();
          break;
        }
      }
      // 旧形式のフォールバック
      if (!boardSlug) {
        boardSlug = urlObj.searchParams.get("board");
      }
      const taskId = urlObj.searchParams.get("task");
      const memoId = urlObj.searchParams.get("memo");

      // HTMLタグを除去してプレーンテキスト化
      const stripHtml = (html: string | undefined): string => {
        if (!html) return "";
        const tmp = document.createElement("div");
        tmp.innerHTML = html;
        return tmp.textContent || tmp.innerText || "";
      };

      const plainContent = stripHtml(content);

      let textToCopy = "";

      // Backlog形式: BOARD-ID タイトル\n内容
      if (boardSlug && (taskId || memoId)) {
        const itemId = taskId || memoId;
        const backlogId = `${boardSlug}-${itemId}`;
        // IDとタイトルを同じ行に、内容は次の行に
        const firstLine = [backlogId, title].filter(Boolean).join(" ");
        textToCopy = [firstLine, plainContent].filter(Boolean).join("\n");
      } else {
        // boardパラメータがない場合は従来通り
        textToCopy = [title, plainContent].filter(Boolean).join("\n\n");
      }

      await navigator.clipboard.writeText(textToCopy || url);
      setCopiedText(true);
      setTimeout(() => setCopiedText(false), 2000);
    } catch (error) {
      console.error("Failed to copy text:", error);
    }
  };

  return (
    <div className={`flex gap-1 ${className}`}>
      {/* テキストコピーボタン */}
      <Tooltip text={copiedText ? "コピーしました！" : "テキストをコピー"}>
        <button
          onClick={handleCopyText}
          className="flex items-center justify-center size-7 rounded-md bg-gray-100 text-gray-600 hover:text-gray-800 hover:bg-gray-200 transition-colors"
        >
          <CopyIcon className="w-5 h-5" />
        </button>
      </Tooltip>
      {/* URL共有ボタン */}
      <Tooltip text={copiedUrl ? "コピーしました！" : label}>
        <button
          onClick={handleCopyUrl}
          className="flex items-center justify-center size-7 rounded-md bg-gray-100 text-gray-600 hover:text-gray-800 hover:bg-gray-200 transition-colors"
        >
          <LinkIcon className="w-4 h-4" />
        </button>
      </Tooltip>
    </div>
  );
}

export default ShareUrlButton;
