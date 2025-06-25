import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import LogoutButton from "../components/logout-button";

export default async function HomePage() {
  const { userId } = await auth(); // ✅ await を追加

  // ログイン済みならメモ画面などにリダイレクト（または表示）
  if (userId) {
    return (
      <main className="flex flex-col items-center justify-center h-screen bg-white gap-4">
        <h2 className="text-2xl font-bold">ようこそ！メモ画面へようこそ 📝</h2>
        <LogoutButton />
      </main>
    );
  }

  // 未ログイン時はウェルカムページを表示
  return (
    <main className="flex flex-col items-center justify-center h-screen gap-8 text-center px-6 bg-gradient-to-b from-gray-50 to-white">
      <div>
        <h1 className="text-4xl sm:text-5xl font-extrabold bg-gradient-to-r from-purple-600 via-indigo-500 to-blue-500 text-transparent bg-clip-text">
          メモ帳へようこそ
        </h1>
        <p className="text-gray-600 mt-3 text-base sm:text-lg">
          あなたのアイデアを、どこでもすぐに記録。
        </p>
      </div>

      <div className="flex flex-wrap justify-center gap-4">
        <Link
          href="/sign-in"
          className="rounded-full border border-gray-300 bg-white px-6 py-2 text-sm font-medium text-gray-800 shadow-md transition hover:bg-gray-100 hover:shadow-lg cursor-pointer"
        >
          ログイン
        </Link>

