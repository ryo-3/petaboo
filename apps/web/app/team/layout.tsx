"use client";

import type { Metadata } from "next";
import Header from "@/components/layout/header";
import Sidebar from "@/components/layout/sidebar";

export default function TeamLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen bg-white overflow-hidden">
      <Header />
      <div className="flex flex-1 pt-16 overflow-hidden">
        <div className="w-16 border-r border-gray-200 overflow-visible">
          <Sidebar
            onNewMemo={() => {}}
            onSelectMemo={() => {}}
            onShowFullList={() => {}}
            onHome={() => {}}
            onEditMemo={() => {}}
            isCompact={true}
          />
        </div>
        <main className="flex-1 overflow-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}