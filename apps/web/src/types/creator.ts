/**
 * 作成者情報の統合型定義
 * エディターコンポーネント等で作成者情報を扱う際の共通インターフェース
 */
export interface CreatorProps {
  /** 作成者の表示名 */
  createdBy?: string | null;
  /** 作成者のユーザーID */
  createdByUserId?: string | null;
  /** 作成者のアバター色 */
  createdByAvatarColor?: string | null;
}

/**
 * チーム機能での作成者情報Props
 * チームモードかどうかの判定とチームIDも含む
 */
export interface TeamCreatorProps extends CreatorProps {
  /** チームモードかどうか */
  teamMode?: boolean;
  /** チームID */
  teamId?: number;
}

/**
 * CreatorInfoからCreatorPropsに変換するヘルパー関数
 */
export function toCreatorProps(
  creatorInfo: {
    createdBy?: string | null;
    userId?: string;
    avatarColor?: string | null;
  } | null,
): CreatorProps {
  if (!creatorInfo) {
    return {
      createdBy: null,
      createdByUserId: null,
      createdByAvatarColor: null,
    };
  }

  return {
    createdBy: creatorInfo.createdBy,
    createdByUserId: creatorInfo.userId,
    createdByAvatarColor: creatorInfo.avatarColor,
  };
}
