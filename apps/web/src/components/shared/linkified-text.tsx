/**
 * URL自動リンク化コンポーネント
 * textareaの下にリンク化されたプレビューを表示
 */

import { linkifyText } from "@/src/utils/linkify";

interface LinkifiedTextProps {
  text: string;
  className?: string;
}

export default function LinkifiedText({
  text,
  className = "",
}: LinkifiedTextProps) {
  if (!text) return null;

  return (
    <div className={`whitespace-pre-wrap leading-relaxed ${className}`}>
      {text.split("\n").map((line, index) => (
        <div key={index}>{line ? linkifyText(line) : <br />}</div>
      ))}
    </div>
  );
}
