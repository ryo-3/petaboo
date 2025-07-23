/**
 * originalId生成ユーティリティ
 * 形式: ${id}${timestamp}${random5桁} (アンダースコアなし)
 * 例: "5169012345678912345"
 */
export function generateOriginalId(id: number): string {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 100000); // 0-99999の5桁
  return `${id}${timestamp}${random.toString().padStart(5, '0')}`;
}

/**
 * 既存のoriginalIdからアンダースコアを除去
 * "1_1753257450509_58648" → "11753257450509958648"
 */
export function migrateOriginalId(oldOriginalId: string): string {
  return oldOriginalId.replace(/_/g, '');
}