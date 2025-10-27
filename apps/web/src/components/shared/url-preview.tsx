/**
 * URL自動リンク化プレビューコンポーネント
 * URLを含む行だけをコンパクトに表示
 */

import { extractUrlLines, linkifyLine } from "@/src/utils/url-detector";

interface UrlPreviewProps {
  text: string;
  className?: string;
}

export default function UrlPreview({ text, className = "" }: UrlPreviewProps) {
  // URLを含む行だけを抽出
  const urlLines = extractUrlLines(text);

  // URLがない場合は何も表示しない
  if (urlLines.length === 0) return null;

  return (
    <div className={`text-sm ${className}`}>
      <div className="space-y-0.5">
        {urlLines.map((line, index) => (
          <div key={index} className="text-gray-700 leading-tight">
            {linkifyLine(line)}
          </div>
        ))}
      </div>
    </div>
  );
}
