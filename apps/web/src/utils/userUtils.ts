/**
 * ユーザー関連のユーティリティ関数
 */

/**
 * ユーザーIDから一意な色を生成する関数
 * @param userId ユーザーID
 * @returns Tailwind CSSの背景色クラス
 */
export function getUserAvatarColor(userId: string): string {
  const colors = [
    "bg-blue-500",
    "bg-green-500",
    "bg-purple-500",
    "bg-pink-500",
    "bg-indigo-500",
    "bg-yellow-500",
    "bg-red-500",
    "bg-teal-500",
    "bg-orange-500",
    "bg-cyan-500",
    "bg-violet-500",
    "bg-fuchsia-500",
    "bg-rose-500",
    "bg-amber-500",
    "bg-lime-500",
    "bg-emerald-500",
    "bg-sky-500",
    "bg-slate-600",
    "bg-gray-600",
    "bg-zinc-600",
    "bg-stone-600",
    "bg-neutral-600",
    "bg-blue-600",
    "bg-green-600",
    "bg-purple-600",
    "bg-pink-600",
    "bg-indigo-600",
    "bg-red-600",
    "bg-teal-600",
    "bg-orange-600",
  ];

  // userIdをハッシュして色のインデックスを決める
  const hash = userId
    .split("")
    .reduce((acc, char) => acc + char.charCodeAt(0), 0);

  return colors[hash % colors.length] || "bg-gray-500";
}
