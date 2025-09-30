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

/**
 * チーム機能での作成者情報フィールド
 * メモ・タスク両方で使用される共通のチーム関連フィールド
 */
export interface TeamCreatorFields {
  /** 作成者のuser ID（チーム機能でのみ使用） */
  userId?: string;
  /** チームID（チーム機能でのみ使用） */
  teamId?: number;
  /** 作成者の表示名（チーム機能でのみ使用） */
  createdBy?: string | null;
  /** 作成者のアバター色（チーム機能でのみ使用） */
  avatarColor?: string | null;
}

/**
 * 基本アイテムの共通フィールド
 * すべてのアイテム（メモ・タスク）が持つ基本的なフィールド
 */
export interface BaseItemFields {
  /** 主キーID */
  id: number;
  /** 元ID（削除・復元時の追跡用） */
  originalId?: OriginalId;
  /** UUID（将来の外部連携用） */
  uuid?: Uuid;
  /** 作成日時（Unix timestamp） */
  createdAt: number;
  /** 更新日時（Unix timestamp） */
  updatedAt?: number | null;
}

/**
 * 削除済みアイテムの追加フィールド
 */
export interface DeletedItemFields {
  /** 削除日時（Unix timestamp） */
  deletedAt: number;
}
