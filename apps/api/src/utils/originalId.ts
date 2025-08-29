/**
 * originalId生成ユーティリティ
 * 形式: IDをそのまま文字列化（AUTO_INCREMENTで一意性保証）
 * 例: id=5 → "5"
 */
export function generateOriginalId(id: number): string {
  return id.toString();
}

/**
 * UUID生成ユーティリティ
 * 将来のエクスポート・インポート用（基本は使わない）
 * 例: "123e4567-e89b-12d3-a456-426614174000"
 */
export function generateUuid(): string {
  return crypto.randomUUID();
}

/**
 * 既存のoriginalIdからアンダースコアを除去
 * "1_1753257450509_58648" → "11753257450509958648"
 */
export function migrateOriginalId(oldOriginalId: string): string {
  return oldOriginalId.replace(/_/g, "");
}
