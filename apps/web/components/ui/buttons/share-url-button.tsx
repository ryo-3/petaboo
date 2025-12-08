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
      // コピー時に最新のURLを取得（useMemoでキャッシュされた古いURLを回避）
      const currentUrl =
        typeof window !== "undefined" ? window.location.href : url;
      await navigator.clipboard.writeText(currentUrl);
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    } catch (error) {
      console.error("Failed to copy URL:", error);
    }
  };

  const handleCopyText = async () => {
    try {
      // URLからboard、task、memoパラメータを抽出してBacklog形式を生成
      // コピー時に最新のURLを取得（useMemoでキャッシュされた古いURLを回避）
      const currentUrl =
        typeof window !== "undefined" ? window.location.href : url;
      const urlObj = new URL(currentUrl);
      // 新形式: ?board=SLUG を優先
      let boardSlug: string | null =
        urlObj.searchParams.get("board")?.toUpperCase() || null;
      // 旧形式との互換性: ?SLUG形式（値が空のキー）
      if (!boardSlug) {
        for (const [key, value] of urlObj.searchParams.entries()) {
          if (
            value === "" &&
            ![
              "boards",
              "memo",
              "task",
              "search",
              "settings",
              "team-list",
              "team-create",
              "team-settings",
              "memos",
              "tasks",
            ].includes(key)
          ) {
            boardSlug = key.toUpperCase();
            break;
          }
        }
      }
      const taskId = urlObj.searchParams.get("task");
      const memoId = urlObj.searchParams.get("memo");

      // HTMLをプレーンテキスト化（段落や改行を保持）
      const toPlainText = (html: string | undefined): string => {
        if (!html) return "";

        // DOMを使ってテキスト抽出（最も確実な方法）
        const tmp = document.createElement("div");
        tmp.innerHTML = html;

        // innerTextはブラウザがレンダリング時の改行を考慮してくれる
        const text = tmp.innerText || tmp.textContent || "";

        // 改行を整える
        return text
          .replace(/\u00a0/g, " ") // &nbsp; を通常スペースに
          .replace(/\r\n/g, "\n")
          .replace(/\n{3,}/g, "\n\n") // 3行以上の連続改行を2行に
          .trim();
      };

      const plainTitle = toPlainText(title);
      const plainContent = toPlainText(content);

      let textToCopy = "";

      // Backlog形式: BOARD-task-ID or BOARD-memo-ID
      if (boardSlug && taskId) {
        // タスク: BOARD-task-ID タイトル\n内容
        const backlogId = `${boardSlug}-task-${taskId}`;
        const firstLine = [backlogId, plainTitle].filter(Boolean).join(" ");
        textToCopy = [firstLine, plainContent].filter(Boolean).join("\n");
      } else if (boardSlug && memoId) {
        // メモ: BOARD-memo-ID\n内容
        const backlogId = `${boardSlug}-memo-${memoId}`;
        textToCopy = [backlogId, plainContent].filter(Boolean).join("\n");
      } else {
        // boardパラメータがない場合は従来通り
        textToCopy = [plainTitle, plainContent].filter(Boolean).join("\n\n");
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
