/**
 * ファイル処理ユーティリティ（PDF・ドキュメント用）
 * - ファイルサイズ制限チェック
 * - MIME type バリデーション
 * - R2キー生成
 */

export const ALLOWED_FILE_TYPES = [
  "application/pdf",
  "application/msword", // .doc
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
  "application/vnd.ms-excel", // .xls
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
  "application/vnd.ms-powerpoint", // .ppt
  "application/vnd.openxmlformats-officedocument.presentationml.presentation", // .pptx
  "text/plain", // .txt
  "text/csv", // .csv
] as const;

export const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB
export const MAX_FILES_PER_ITEM = 10; // メモ・タスク・コメントごと10ファイル

export interface FileValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * ファイルのバリデーション
 */
export function validateFile(
  file: File,
  mimeType: string,
): FileValidationResult {
  // MIME type チェック
  if (!ALLOWED_FILE_TYPES.includes(mimeType as any)) {
    return {
      valid: false,
      error: `対応していないファイル形式です。PDF, Word, Excel, PowerPoint, テキストファイルのみ対応しています。`,
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
 * R2オブジェクトキー生成（ファイル用）
 * フォーマット: {userId}/files/{attachedTo}/{timestamp}-{randomId}.{ext}
 */
export function generateFileR2Key(
  userId: string,
  attachedTo: string,
  fileName: string,
): string {
  const timestamp = Date.now();
  const randomId = Math.random().toString(36).substring(2, 10);
  const ext = fileName.split(".").pop() || "pdf";
  return `${userId}/files/${attachedTo}/${timestamp}-${randomId}.${ext}`;
}

/**
 * ファイル種別判定
 */
export function isImageFile(mimeType: string): boolean {
  return mimeType.startsWith("image/");
}

export function isPdfFile(mimeType: string): boolean {
  return mimeType === "application/pdf";
}
