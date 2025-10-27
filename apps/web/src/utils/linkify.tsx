/**
 * テキスト内のURLを自動的にリンク化するユーティリティ
 */

/**
 * URLパターンを検出する正規表現
 * - http:// または https:// で始まるURL
 * - www. で始まるURL
 * より正確なURL検出のため、末尾の句読点を除外
 */
const URL_PATTERN =
  /(https?:\/\/[^\s<>"\u{3000}]+(?<![。、！？.,!?;:)])|www\.[^\s<>"\u{3000}]+(?<![。、！？.,!?;:)]))/gu;

/**
 * テキスト内のURLをリンク化したJSX要素の配列を返す
 * @param text リンク化するテキスト
 * @returns JSX要素の配列
 */
export function linkifyText(text: string): (string | JSX.Element)[] {
  const parts: (string | JSX.Element)[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  // URLパターンをリセット
  URL_PATTERN.lastIndex = 0;

  while ((match = URL_PATTERN.exec(text)) !== null) {
    const url = match[0];
    const index = match.index;

    // URL前のテキストを追加
    if (index > lastIndex) {
      parts.push(text.slice(lastIndex, index));
    }

    // URLをリンクとして追加
    const href = url.startsWith("http") ? url : `https://${url}`;
    parts.push(
      <a
        key={`link-${index}`}
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-600 hover:text-blue-800 underline break-all"
        onClick={(e) => e.stopPropagation()}
      >
        {url}
      </a>,
    );

    lastIndex = index + url.length;
  }

  // 残りのテキストを追加
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length > 0 ? parts : [text];
}

/**
 * 1行内のテキストをリンク化（既存の要素と組み合わせ可能）
 * @param text リンク化するテキスト
 * @returns JSX要素の配列
 */
export function linkifyLine(text: string): JSX.Element[] {
  const linked = linkifyText(text);
  return linked.map((part, index) =>
    typeof part === "string" ? <span key={`text-${index}`}>{part}</span> : part,
  );
}
