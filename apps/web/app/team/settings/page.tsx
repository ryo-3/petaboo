import { auth } from "@clerk/nextjs/server";
import TeamSettingsScreen from "@/components/screens/team-settings-screen";

export default async function TeamSettingsPage() {
  const { userId } = await auth();

  if (!userId) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-gray-600">ログインが必要です</p>
      </div>
    );
  }

  // TODO: 実際のteamIdはURLパラメータやユーザー設定から取得
  return <TeamSettingsScreen teamId={1} />;
}