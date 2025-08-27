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
  return children;
}