/**
 * ファイルバリデーション共通ユーティリティ
 * メモ・タスク・コメントで共通使用
 */

// 許可されたMIMEタイプ
export const ALLOWED_FILE_TYPES = {
  images: [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/gif",
    "image/webp",
    "image/svg+xml",
  ],
  documents: [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "text/plain",
    "text/csv",
  ],
} as const;

export const ALL_ALLOWED_TYPES = [
  ...ALLOWED_FILE_TYPES.images,
  ...ALLOWED_FILE_TYPES.documents,
];

// サイズ制限
export const FILE_SIZE_LIMITS = {
  image: 5 * 1024 * 1024, // 5MB（圧縮前の上限、圧縮後はこれ以下になる）
  document: 20 * 1024 * 1024, // 20MB
} as const;

export const MAX_ATTACHMENTS_PER_ITEM = 10;

export interface FileValidationResult {
  valid: boolean;
  error?: string;
  needsCompression?: boolean; // 圧縮が必要かどうか
}

/**
 * ファイルが画像かどうかを判定
 */
export function isImageFile(file: File): boolean {
  return file.type.startsWith("image/");
}

/**
 * ファイルが圧縮可能な画像かどうかを判定
 * SVGとGIFは圧縮対象外
 */
export function isCompressibleImage(file: File): boolean {
  return (
    isImageFile(file) &&
    file.type !== "image/svg+xml" &&
    file.type !== "image/gif"
  );
}

/**
 * ファイルバリデーション
 * @param file - 検証するファイル
 * @param options - オプション（圧縮を考慮するかどうか）
 */
export function validateFile(
  file: File,
  options: { allowCompression?: boolean } = {},
): FileValidationResult {
  const { allowCompression = true } = options;

  // MIMEタイプチェック
  if (!ALL_ALLOWED_TYPES.includes(file.type as (typeof ALL_ALLOWED_TYPES)[number])) {
    return {
      valid: false,
      error: `対応していないファイル形式です（${file.type}）`,
    };
  }

  // サイズチェック
  const isImage = isImageFile(file);
  const maxSize = isImage ? FILE_SIZE_LIMITS.image : FILE_SIZE_LIMITS.document;

  if (file.size > maxSize) {
    // 画像で圧縮可能な場合は圧縮を試みる
    if (allowCompression && isCompressibleImage(file)) {
      return {
        valid: true,
        needsCompression: true,
      };
    }

    const maxMB = maxSize / 1024 / 1024;
    return {
      valid: false,
      error: `ファイルサイズは${maxMB}MB以下にしてください`,
    };
  }

  return { valid: true, needsCompression: false };
}
