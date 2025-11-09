/**
 * HTMLタグを除去してプレーンテキストを取得
 */
export function stripHtmlTags(html: string): string {
  // HTMLタグを除去
  return html.replace(/<[^>]*>/g, "");
}

/**
 * HTML文字列からプレビュー用のテキストを生成
 */
export function getTextPreview(html: string, maxLength: number = 100): string {
  const plainText = stripHtmlTags(html);
  return plainText.length > maxLength
    ? plainText.slice(0, maxLength) + "..."
    : plainText;
}
