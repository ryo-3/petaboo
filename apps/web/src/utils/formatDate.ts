/**
 * UnixタイムスタンプをJST形式の文字列に変換
 */
export function formatDate(timestamp: number): string {
  console.log('🕒 formatDate called with timestamp:', timestamp, 'type:', typeof timestamp);
  
  if (!timestamp || typeof timestamp !== 'number') {
    console.error('❌ formatDate: invalid timestamp:', timestamp);
    return '不明な日付';
  }
  
  const date = new Date(timestamp * 1000);
  console.log('🕒 converted to Date:', date, 'isValid:', !isNaN(date.getTime()));
  
  if (isNaN(date.getTime())) {
    console.error('❌ formatDate: Invalid Date created from timestamp:', timestamp);
    return '不正な日付';
  }
  
  const formatted = date.toLocaleString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).replace(/\//g, '/');
  
  console.log('🕒 formatted result:', formatted);
  return formatted;
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