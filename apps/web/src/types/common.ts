/**
 * 共通型定義
 */

/**
 * originalId型 - AUTO_INCREMENTのIDを文字列化したもの
 * 例: id=5 → originalId="5"
 * 
 * 用途:
 * - 削除・復元時の一意性追跡
 * - ボードアイテムの識別
 * - 基本的にはIDの文字列版として使用
 */
export type OriginalId = string;

/**
 * UUID型 - 将来のエクスポート・インポート用
 * 例: "123e4567-e89b-12d3-a456-426614174000"
 * 
 * 用途:
 * - 外部システムとの連携
 * - エクスポート・インポート機能
 * - 分散システムでの一意性保証
 * - 基本的には使わない（将来用）
 */
export type Uuid = string;