/**
 * 画像圧縮ユーティリティ
 * browser-image-compression を使用
 */
import imageCompression from "browser-image-compression";

export interface CompressionResult {
  file: File;
  wasCompressed: boolean;
  originalSize: number;
  compressedSize: number;
}

export interface CompressionOptions {
  maxSizeMB?: number; // 目標サイズ（デフォルト: 5MB）
  maxWidthOrHeight?: number; // 最大幅/高さ（デフォルト: 2560px）
  quality?: number; // 品質 0-1（デフォルト: 0.8）
}

const DEFAULT_OPTIONS: Required<CompressionOptions> = {
  maxSizeMB: 5,
  maxWidthOrHeight: 2560,
  quality: 0.8,
};

/**
 * 画像を圧縮する
 * - 画像以外のファイルはそのまま返す
 * - 既に目標サイズ以下の場合もそのまま返す
 */
export async function compressImage(
  file: File,
  options: CompressionOptions = {},
): Promise<CompressionResult> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const originalSize = file.size;

  // 画像以外はそのまま返す
  if (!file.type.startsWith("image/")) {
    return {
      file,
      wasCompressed: false,
      originalSize,
      compressedSize: originalSize,
    };
  }

  // SVGは圧縮不可（ベクター形式）
  if (file.type === "image/svg+xml") {
    return {
      file,
      wasCompressed: false,
      originalSize,
      compressedSize: originalSize,
    };
  }

  // GIFは圧縮対象外（アニメーション保護）
  if (file.type === "image/gif") {
    return {
      file,
      wasCompressed: false,
      originalSize,
      compressedSize: originalSize,
    };
  }

  // 既に目標サイズ以下ならそのまま返す
  const maxSizeBytes = opts.maxSizeMB * 1024 * 1024;
  if (file.size <= maxSizeBytes) {
    return {
      file,
      wasCompressed: false,
      originalSize,
      compressedSize: originalSize,
    };
  }

  // 圧縮実行
  const compressedFile = await imageCompression(file, {
    maxSizeMB: opts.maxSizeMB,
    maxWidthOrHeight: opts.maxWidthOrHeight,
    initialQuality: opts.quality,
    useWebWorker: true,
    fileType: file.type as "image/jpeg" | "image/png" | "image/webp",
  });

  return {
    file: compressedFile,
    wasCompressed: true,
    originalSize,
    compressedSize: compressedFile.size,
  };
}

/**
 * 複数画像を並列圧縮
 */
export async function compressImages(
  files: File[],
  options: CompressionOptions = {},
): Promise<CompressionResult[]> {
  return Promise.all(files.map((file) => compressImage(file, options)));
}

/**
 * 圧縮結果のサマリーを取得
 */
export function getCompressionSummary(results: CompressionResult[]): {
  totalOriginal: number;
  totalCompressed: number;
  compressedCount: number;
  savedBytes: number;
  savedPercent: number;
} {
  const totalOriginal = results.reduce((sum, r) => sum + r.originalSize, 0);
  const totalCompressed = results.reduce((sum, r) => sum + r.compressedSize, 0);
  const compressedCount = results.filter((r) => r.wasCompressed).length;
  const savedBytes = totalOriginal - totalCompressed;
  const savedPercent =
    totalOriginal > 0 ? (savedBytes / totalOriginal) * 100 : 0;

  return {
    totalOriginal,
    totalCompressed,
    compressedCount,
    savedBytes,
    savedPercent,
  };
}

/**
 * バイト数を人間が読みやすい形式に変換
 */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
