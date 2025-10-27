/**
 * テキスト内のURLを検出してリンク化するユーティリティ
 */

/**
 * URLパターンを検出する正規表現
 */
const URL_PATTERN = /(https?:\/\/[^\s<>"\u{3000}]+|www\.[^\s<>"\u{3000}]+)/gu;

/**
 * テキスト内にURLが含まれているかチェック
 */
export function containsUrl(text: string): boolean {
  return URL_PATTERN.test(text);
}

/**
 * テキストからURLを含む行のみを抽出
 */
export function extractUrlLines(text: string): string[] {
  const lines = text.split("\n");
  return lines.filter((line) => containsUrl(line));
}

/**
 * 1行のテキスト内のURLをリンク化
 */
export function linkifyLine(line: string): (string | JSX.Element)[] {
  const parts: (string | JSX.Element)[] = [];
  let lastIndex = 0;

  // URLパターンをリセット
  const pattern = new RegExp(URL_PATTERN.source, URL_PATTERN.flags);
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(line)) !== null) {
    const url = match[0];
    const index = match.index;

    // URL前のテキストを追加
    if (index > lastIndex) {
      parts.push(line.slice(lastIndex, index));
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
  if (lastIndex < line.length) {
    parts.push(line.slice(lastIndex));
  }

  return parts.length > 0 ? parts : [line];
}
