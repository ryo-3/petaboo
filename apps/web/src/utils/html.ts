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
