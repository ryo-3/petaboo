import { redirect } from "next/navigation";

interface BoardSettingsPageProps {
  params: Promise<{ slug: string }>;
}

export default async function BoardSettingsPage({
  params,
}: BoardSettingsPageProps) {
  const { slug } = await params;

  // 新形式のURLにリダイレクト
  redirect(`/boards/${slug}?settings=true`);
}
