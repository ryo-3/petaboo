/**
 * UnixタイムスタンプをJST形式の文字列に変換
 */
export function formatDate(timestamp: number): string {
  if (!timestamp || typeof timestamp !== "number") {
    return "不明な日付";
  }

  const date = new Date(timestamp * 1000);

  if (isNaN(date.getTime())) {
    return "不正な日付";
  }

  const formatted = date
    .toLocaleString("ja-JP", {
      year: "2-digit",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    })
    .replace(/\//g, "/");

  return formatted;
}

/**
 * UnixタイムスタンプをJST形式の日付のみに変換
 * 秒単位とミリ秒単位の両方に対応
 */
export function formatDateOnly(timestamp: number): string {
  if (!timestamp || typeof timestamp !== "number") {
    return "不明な日付";
  }

  // タイムスタンプが秒単位かミリ秒単位かを判定
  // 10桁（秒単位）または13桁（ミリ秒単位）で判定
  const isMilliseconds = timestamp.toString().length === 13;
  const dateTimestamp = isMilliseconds ? timestamp : timestamp * 1000;

  const date = new Date(dateTimestamp);

  if (isNaN(date.getTime())) {
    return "不正な日付";
  }

  // 1980年より前の日付は不正とみなす
  if (date.getFullYear() < 1980) {
    return "不明な日付";
  }

  return date
    .toLocaleDateString("ja-JP", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
    .replace(/\//g, "/");
}

/**
 * UnixタイムスタンプをJST形式の時間のみに変換
 */
export function formatTimeOnly(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleTimeString("ja-JP", {
    hour: "2-digit",
    minute: "2-digit",
  });
}
