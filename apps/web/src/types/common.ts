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
 * OriginalId変換ユーティリティ
 *
 * originalIdの型変換を一元管理し、コード全体で統一的な変換を保証します。
 *
 * @example
 * ```typescript
 * // アイテムからoriginalIdを取得
 * const originalId = OriginalIdUtils.fromItem(task);
 *
 * // number/stringからoriginalIdに変換
 * const originalId = OriginalIdUtils.from(task.id);
 *
 * // originalIdをnumberに変換
 * const id = OriginalIdUtils.toNumber(originalId);
 * ```
 */
export const OriginalIdUtils = {
  /**
   * number | string | undefined を OriginalId に変換
   *
   * @param id - 変換元のID
   * @returns OriginalId（undefined の場合は undefined を返す）
   *
   * @example
   * ```typescript
   * OriginalIdUtils.from(5)        // "5"
   * OriginalIdUtils.from("5")      // "5"
   * OriginalIdUtils.from(0)        // undefined
   * OriginalIdUtils.from("0")      // undefined
   * OriginalIdUtils.from(undefined) // undefined
   * ```
   */
  from(id: number | string | undefined): OriginalId | undefined {
    if (id === undefined || id === 0 || id === "0") return undefined;
    return id.toString();
  },

  /**
   * OriginalId を number に変換（必要な場合のみ）
   *
   * @param originalId - 変換元のoriginalId
   * @returns number（変換失敗時は undefined を返す）
   *
   * @example
   * ```typescript
   * OriginalIdUtils.toNumber("5")   // 5
   * OriginalIdUtils.toNumber("abc") // undefined
   * OriginalIdUtils.toNumber(undefined) // undefined
   * ```
   */
  toNumber(originalId: OriginalId | undefined): number | undefined {
    if (!originalId) return undefined;
    const num = parseInt(originalId, 10);
    return isNaN(num) ? undefined : num;
  },

  /**
   * アイテムからoriginalIdを取得
   *
   * アイテムのoriginalIdフィールドが存在すればそれを返し、
   * なければidフィールドを文字列化して返します。
   *
   * @param item - メモ・タスク等のアイテム
   * @returns OriginalId（アイテムがnullの場合は undefined を返す）
   *
   * @example
   * ```typescript
   * // originalIdがある場合
   * OriginalIdUtils.fromItem({ id: 5, originalId: "10" }) // "10"
   *
   * // originalIdがない場合
   * OriginalIdUtils.fromItem({ id: 5 }) // "5"
   *
   * // idが0の場合
   * OriginalIdUtils.fromItem({ id: 0 }) // undefined
   *
   * // アイテムがnullの場合
   * OriginalIdUtils.fromItem(null) // undefined
   * ```
   */
  fromItem(
    item: { id?: number; originalId?: string } | undefined | null,
  ): OriginalId | undefined {
    if (!item) return undefined;
    return item.originalId || this.from(item.id);
  },
};

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
