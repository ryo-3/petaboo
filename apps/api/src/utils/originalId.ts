/**
 * originalId生成ユーティリティ
 * 形式: ${id}_${timestamp}_${random5桁}
 * 例: "5_1690123456789_12345"
 */
export function generateOriginalId(id: number): string {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 100000); // 0-99999の5桁
  return `${id}_${timestamp}_${random.toString().padStart(5, '0')}`;
}