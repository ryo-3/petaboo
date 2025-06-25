import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import LogoutButton from "../components/logout-button";
import Main from "./main";

export default async function HomePage() {
  const { userId } = await auth(); // ✅ await を追加

  // ログイン済みならメモ画面などにリダイレクト（または表示）
  if (userId) {
    return <Main />;
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
        <Link
          href="/sign-up"
          className="rounded-full bg-gradient-to-r from-purple-500 to-indigo-500 px-6 py-2 text-sm font-medium text-white shadow-md transition hover:shadow-lg hover:brightness-110 cursor-pointer"
        >
          新規作成
        </Link>
      </div>
    </main>
  );
}
