import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "チームメモ | Note App",
  description: "チーム用メモ・タスク管理アプリ",
};

export default function TeamLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-900">
                チームメモ
              </h1>
            </div>
            <nav className="flex space-x-8">
              <a href="/team" className="text-gray-500 hover:text-gray-900 px-3 py-2 text-sm font-medium">
                ダッシュボード
              </a>
              <a href="/team/memos" className="text-gray-500 hover:text-gray-900 px-3 py-2 text-sm font-medium">
                メモ
              </a>
              <a href="/team/tasks" className="text-gray-500 hover:text-gray-900 px-3 py-2 text-sm font-medium">
                タスク
              </a>
              <Link href="/" className="text-gray-400 hover:text-gray-600 px-3 py-2 text-sm font-medium">
                個人用に戻る
              </Link>
            </nav>
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
}