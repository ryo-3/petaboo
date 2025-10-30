/**
 * 画像処理ユーティリティ
 * - 画像圧縮
 * - サイズ制限チェック
 * - MIME type バリデーション
 */

export const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/svg+xml",
] as const;

export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
export const MAX_ATTACHMENTS_PER_ITEM = 10; // メモ・タスク・コメントごと10枚

export interface ImageValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * 画像ファイルのバリデーション
 */
export function validateImageFile(
  file: File,
  mimeType: string,
): ImageValidationResult {
  // MIME type チェック
  if (!ALLOWED_MIME_TYPES.includes(mimeType as any)) {
    return {
      valid: false,
      error: `対応していないファイル形式です。JPEG, PNG, GIF, WebP, SVGのみ対応しています。`,
    };
  }

  // ファイルサイズチェック
  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `ファイルサイズが大きすぎます。最大${MAX_FILE_SIZE / 1024 / 1024}MBまでです。`,
    };
  }

  return { valid: true };
}

/**
 * R2オブジェクトキー生成
 * フォーマット: {userId}/images/{attachedTo}/{timestamp}-{randomId}.{ext}
 */
export function generateR2Key(
  userId: string,
  attachedTo: string,
  fileName: string,
): string {
  const timestamp = Date.now();
  const randomId = Math.random().toString(36).substring(2, 10);
  const ext = fileName.split(".").pop() || "jpg";
  return `${userId}/images/${attachedTo}/${timestamp}-${randomId}.${ext}`;
}

/**
 * R2公開URL生成
 */
export function generatePublicUrl(
  r2PublicDomain: string,
  r2Key: string,
): string {
  return `https://${r2PublicDomain}/${r2Key}`;
}
