/**
 * アイコンコンポーネント共通Props型定義
 */

/**
 * 基本的なアイコンProps
 * 全てのアイコンコンポーネントで使用
 */
export interface BaseIconProps {
  /** CSSクラス名（サイズ、色、その他のスタイル） */
  className?: string;
}

/**
 * 拡張アイコンProps
 * より複雑なアイコンで使用（将来の拡張用）
 */
export interface ExtendedIconProps extends BaseIconProps {
  /** アイコンのサイズ（数値指定） */
  size?: number;
  /** 色指定（Tailwind CSS色名または任意の色値） */
  color?: string;
  /** ストローク幅 */
  strokeWidth?: number;
}

/**
 * SVGアイコン共通属性
 * SVG要素に渡される基本属性
 */
export interface SvgIconAttributes {
  fill?: string;
  stroke?: string;
  strokeWidth?: number | string;
  viewBox?: string;
  xmlns?: string;
  strokeLinecap?: "butt" | "round" | "square";
  strokeLinejoin?: "miter" | "round" | "bevel";
}

/**
 * アイコンのデフォルトサイズ定義
 * 用途別に推奨サイズを統一
 */
export const IconSizes = {
  /** 極小: ボタン内アイコンなど */
  xs: "w-3 h-3",
  /** 小: インライン表示など */
  sm: "w-4 h-4",
  /** 中: 一般的なアイコン */
  md: "w-5 h-5",
  /** 大: 強調表示など */
  lg: "w-6 h-6",
  /** 特大: ヘッダーアイコンなど */
  xl: "w-8 h-8",
} as const;

/**
 * アイコンの色パターン
 * よく使用される色の組み合わせ
 */
export const IconColors = {
  /** デフォルト: 現在の文字色 */
  current: "text-current",
  /** グレー系 */
  gray: "text-gray-500",
  grayDark: "text-gray-700",
  grayLight: "text-gray-400",
  /** 状態表示色 */
  success: "text-green-500",
  warning: "text-yellow-500",
  error: "text-red-500",
  info: "text-blue-500",
  /** プライマリ色 */
  primary: "text-blue-600",
  secondary: "text-gray-600",
} as const;

/**
 * ユーティリティ型: アイコンサイズの型
 */
export type IconSizeKey = keyof typeof IconSizes;

/**
 * ユーティリティ型: アイコン色の型
 */
export type IconColorKey = keyof typeof IconColors;

/**
 * アイコンProps作成ヘルパー
 * サイズと色を簡単に指定できるProps作成関数
 */
export function createIconProps(
  size: IconSizeKey = "md",
  color: IconColorKey = "current",
  additionalClasses = "",
): { className: string } {
  const sizeClass = IconSizes[size];
  const colorClass = IconColors[color];
  const className = [sizeClass, colorClass, additionalClasses]
    .filter(Boolean)
    .join(" ");

  return { className };
}

/**
 * 使用例:
 *
 * // 基本的な使用
 * interface MyIconProps extends BaseIconProps {}
 *
 * // 拡張Props使用
 * interface MyComplexIconProps extends ExtendedIconProps {}
 *
 * // ヘルパー関数使用
 * const props = createIconProps("lg", "primary", "hover:opacity-80");
 */
