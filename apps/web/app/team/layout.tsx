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
  const isTeamPage = pathname.startsWith('/team') && !pathname.includes('/create');
  
  // チーム一覧ページかどうかを判定
  const isTeamListPage = pathname === '/team';
  
  const handleTeamList = () => {
    router.push('/team');
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
            onHome={() => router.push('/')}
            onEditMemo={() => {}}
            isCompact={true}
            isTeamDetailPage={isTeamPage}
            isTeamListPage={isTeamListPage}
            onTeamList={handleTeamList}
          />
        </div>
        <main className="flex-1 overflow-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}