/**
 * UnixタイムスタンプをJST形式の文字列に変換
 */
export function formatDate(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleString('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

/**
 * UnixタイムスタンプをJST形式の日付のみに変換
 */
export function formatDateOnly(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleDateString('ja-JP')
}