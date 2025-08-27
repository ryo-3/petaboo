import { auth } from "@clerk/nextjs/server";
import Main from "../main";

export default async function TeamPage() {
  const { userId } = await auth();

  if (!userId) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-gray-600">ログインが必要です</p>
      </div>
    );
  }

  // チームモードでMainコンポーネントを使用
  // TODO: 実際のteamIdはURLパラメータやユーザー設定から取得
  return <Main teamMode={true} teamId={1} />;
}