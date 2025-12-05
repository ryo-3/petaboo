import { redirect } from "next/navigation";

interface BoardPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ settings?: string }>;
}

/**
 * /boards/[slug] → /?board=SLUG へのリダイレクト
 * 旧形式のURLから新形式（クエリパラメータ形式）へ転送
 * 既存のブックマークや共有リンクに対応
 */
export default async function BoardPage({
  params,
  searchParams,
}: BoardPageProps) {
  const { slug } = await params;
  const { settings } = await searchParams;

  // 設定画面の場合は ?board=SLUG&settings=true にリダイレクト
  if (settings === "true") {
    redirect(`/?board=${slug.toUpperCase()}&settings=true`);
  }

  // 通常のボード詳細は ?board=SLUG にリダイレクト
  redirect(`/?board=${slug.toUpperCase()}`);
}
