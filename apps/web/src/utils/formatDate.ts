/**
 * UnixタイムスタンプをJST形式の文字列に変換
 * 今年のデータ: MM/DD HH:mm
 * 去年以前: YY/MM/DD HH:mm
 */
export function formatDate(timestamp: number): string {
  if (!timestamp || typeof timestamp !== "number") {
    return "不明な日付";
  }

  const date = new Date(timestamp * 1000);

  if (isNaN(date.getTime())) {
    return "不正な日付";
  }

  const now = new Date();
  const isSameYear = date.getFullYear() === now.getFullYear();

  if (isSameYear) {
    return date
      .toLocaleString("ja-JP", {
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      })
      .replace(/\//g, "/");
  }

  return date
    .toLocaleString("ja-JP", {
      year: "2-digit",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    })
    .replace(/\//g, "/");
}

/**
 * UnixタイムスタンプをJST形式の日付のみに変換
 * 秒単位とミリ秒単位の両方に対応
 * 今年のデータ: 10/01 (月/日のみ)
 * 去年以前: 24/10/01 (年(下2桁)/月/日)
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

  const now = new Date();
  const currentYear = now.getFullYear();
  const dateYear = date.getFullYear();

  // 今年のデータは月/日のみ
  if (dateYear === currentYear) {
    return date
      .toLocaleDateString("ja-JP", {
        month: "2-digit",
        day: "2-digit",
      })
      .replace(/\//g, "/");
  }

  // 去年以前は年(下2桁)/月/日
  return date
    .toLocaleDateString("ja-JP", {
      year: "2-digit",
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

/**
 * Unixタイムスタンプから現在までの経過時間を日本語で返す
 * 例: "5分前", "2時間前", "3日前"
 */
export function formatDistanceToNow(timestamp: number): string {
  if (!timestamp || typeof timestamp !== "number") {
    return "不明";
  }

  const now = Math.floor(Date.now() / 1000);
  const diff = now - timestamp;

  if (diff < 60) {
    return "たった今";
  }

  const minutes = Math.floor(diff / 60);
  if (minutes < 60) {
    return `${minutes}分前`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours}時間前`;
  }

  const days = Math.floor(hours / 24);
  if (days < 7) {
    return `${days}日前`;
  }

  const weeks = Math.floor(days / 7);
  if (weeks < 4) {
    return `${weeks}週間前`;
  }

  const months = Math.floor(days / 30);
  if (months < 12) {
    return `${months}ヶ月前`;
  }

  const years = Math.floor(days / 365);
  return `${years}年前`;
}
