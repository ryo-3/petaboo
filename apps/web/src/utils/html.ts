/**
 * HTMLタグとエンティティを除去して実質的な内容を取得
 * Tiptapエディターの<p></p>などの空タグを考慮した空判定に使用
 */
export function stripHtmlTags(str: string): string {
  // HTMLタグを除去
  const withoutTags = str.replace(/<[^>]*>/g, "");
  // HTML実体参照をデコード
  const withoutEntities = withoutTags
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"');
  return withoutEntities.trim();
}

/**
 * 内容が実質的に空かどうかを判定
 */
export function isContentEmpty(str: string): boolean {
  return !stripHtmlTags(str);
}

/**
 * HTMLコンテンツから最初の行をプレーンテキストで抽出
 * メモのタイトル表示に使用
 * @param content - HTMLコンテンツ
 * @param maxLength - 最大文字数（デフォルト200）
 * @returns プレーンテキストの1行目（空の場合は"無題"）
 */
export function extractFirstLine(
  content: string | null | undefined,
  maxLength: number = 200,
): string {
  if (!content || content.trim() === "") {
    return "無題";
  }

  // HTMLタグを除去
  const plainText = stripHtmlTags(content);

  // 最初の行を取得
  const firstLine = plainText.split("\n")[0] || "";

  // 空白を除去して指定文字数に制限
  const trimmed = firstLine.trim();
  return trimmed.slice(0, maxLength) || "無題";
}
