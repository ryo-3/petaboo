"use client";

import type { Metadata } from "next";
import { usePathname, useRouter } from "next/navigation";
import Header from "@/components/layout/header";
import Sidebar from "@/components/layout/sidebar";

export default function TeamLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  // /team 関連のページかどうかを判定（/team/create は除く）
  const isTeamPage =
    pathname.startsWith("/team") && !pathname.includes("/create");

  // チーム一覧ページかどうかを判定
  const isTeamListPage = pathname === "/team";

  // チーム詳細ページかどうかを判定（/team/customUrl の形式）
  const isTeamDetailPage = pathname.startsWith("/team/") && pathname !== "/team";

  const handleTeamList = () => {
    router.push("/team");
  };

  // ホーム遷移ロジック：チーム詳細ページの場合はそのチームのページに戻る
  const handleHome = () => {
    if (pathname.startsWith("/team/") && pathname !== "/team") {
      // チーム詳細ページの場合は、現在のチームページに戻る
      const segments = pathname.split("/");
      if (segments.length >= 3) {
        const customUrl = segments[2];
        router.push(`/team/${customUrl}`);
      } else {
        router.push("/");
      }
    } else {
      // それ以外は通常のホームページ
      router.push("/");
    }
  };
  return (
    <div className="flex h-screen bg-white overflow-hidden">
      <Header />
      <div className="flex flex-1 pt-16 overflow-hidden">
        <div className="w-16 border-r border-gray-200 overflow-visible">
          <Sidebar
            onNewMemo={() => {}}
            onSelectMemo={() => {}}
            onShowFullList={() => {}}
            onHome={handleHome}
            onEditMemo={() => {}}
            isCompact={true}
            isTeamDetailPage={isTeamPage}
            isTeamListPage={isTeamListPage}
            isTeamHomePage={isTeamDetailPage}
            onTeamList={handleTeamList}
          />
        </div>
        <main className="flex-1 overflow-hidden">{children}</main>
      </div>
    </div>
  );
}
