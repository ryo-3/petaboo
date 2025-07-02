/**
 * UnixタイムスタンプをJST形式の文字列に変換
 */
export function formatDate(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).replace(/\//g, '/')
}

/**
 * UnixタイムスタンプをJST形式の日付のみに変換
 */
export function formatDateOnly(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).replace(/\//g, '/')
}

/**
 * UnixタイムスタンプをJST形式の時間のみに変換
 */
export function formatTimeOnly(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleTimeString('ja-JP', {
    hour: '2-digit',
    minute: '2-digit'
  })
}