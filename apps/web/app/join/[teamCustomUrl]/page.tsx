"use client";

import { useParams, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@clerk/nextjs";

interface TeamInfo {
  name: string;
  description: string | null;
  memberCount: number;
}

interface ApplicationStatus {
  status: "pending" | "member";
  displayName?: string;
  appliedAt?: number;
  role?: string;
  joinedAt?: number;
}

interface VerifyTokenResponse {
  team: TeamInfo;
  isValid: boolean;
  message?: string;
  applicationStatus?: ApplicationStatus | null;
}

export default function JoinTeamPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const { isSignedIn, isLoaded, getToken } = useAuth();

  const [teamInfo, setTeamInfo] = useState<TeamInfo | null>(null);
  const [isValidToken, setIsValidToken] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [applicationStatus, setApplicationStatus] =
    useState<ApplicationStatus | null>(null);

  const teamCustomUrl = params.teamCustomUrl as string;
  const token = searchParams.get("token");

  useEffect(() => {
    const verifyToken = async () => {
      if (!token) {
        setError("招待URLが無効です");
        setLoading(false);
        return;
      }

      try {
        // 認証状態をチェックしてAuthorizationヘッダーを含める
        const authToken = isSignedIn ? await getToken() : null;

        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/teams/join/${teamCustomUrl}?token=${token}`,
          {
            headers: {
              "Content-Type": "application/json",
              ...(authToken && { Authorization: `Bearer ${authToken}` }),
            },
          },
        );

        const data: VerifyTokenResponse = await response.json();

        if (response.ok && data.isValid) {
          setTeamInfo(data.team);
          setIsValidToken(true);
          setApplicationStatus(data.applicationStatus || null);
        } else {
          setError(data.message || "招待URLが無効または期限切れです");
        }
      } catch (err) {
        console.error("トークン検証エラー:", err);
        setError("招待URLの確認中にエラーが発生しました");
      } finally {
        setLoading(false);
      }
    };

    // ログイン状態を待たずに、トークン検証を実行
    if (teamCustomUrl && token) {
      verifyToken();
    }
  }, [teamCustomUrl, token, isSignedIn, getToken]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isSignedIn) {
      // ログインページにリダイレクト
      window.location.href = "/sign-in";
      return;
    }

    if (!displayName.trim()) {
      setError("表示名を入力してください");
      return;
    }

    if (!token) {
      setError("招待トークンが無効です");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const authToken = await getToken();

      // Clerkからユーザー情報を取得
      const user = window.Clerk?.user;
      const userEmail = user?.emailAddresses?.[0]?.emailAddress || "";

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/teams/join/${teamCustomUrl}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(authToken && { Authorization: `Bearer ${authToken}` }),
          },
          body: JSON.stringify({ token, displayName, email: userEmail }),
        },
      );

      const data = await response.json();

      if (response.ok) {
        // 成功時はチーム画面にリダイレクト
        window.location.href = "/team";
      } else {
        setError(data.message || "参加申請の送信に失敗しました");
      }
    } catch (err) {
      console.error("参加申請エラー:", err);
      setError("参加申請の送信中にエラーが発生しました");
    } finally {
      setSubmitting(false);
    }
  };

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !isValidToken || !teamInfo) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="p-8 max-w-md mx-auto text-center">
          <h1 className="text-xl font-semibold text-gray-800 mb-4">エラー</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          {!isSignedIn && (
            <div className="space-y-3">
              <p className="text-sm text-gray-500">
                チームメンバーとしてサインインするとアクセスできる場合があります
              </p>
              <Button
                onClick={() => (window.location.href = "/sign-in")}
                className="w-full"
              >
                サインイン
              </Button>
            </div>
          )}
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4">
        {/* チーム情報表示 */}
        <Card className="p-8 mb-6">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              チーム招待
            </h1>
            <p className="text-gray-600">
              以下のチームへの参加が招待されています
            </p>
          </div>

          <div className="bg-blue-50 p-6 rounded-lg mb-6">
            <h2 className="text-xl font-semibold text-blue-900 mb-2">
              {teamInfo.name}
            </h2>
            {teamInfo.description && (
              <p className="text-blue-800 mb-3">{teamInfo.description}</p>
            )}
            <div className="flex items-center text-sm text-blue-700">
              <span>👥 {teamInfo.memberCount}人のメンバー</span>
            </div>
          </div>

          {!isSignedIn ? (
            <div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <h3 className="text-lg font-semibold text-blue-900 mb-2">
                  🎉 チーム参加手順
                </h3>
                <div className="text-blue-800 text-sm space-y-2">
                  <div className="flex items-start space-x-2">
                    <span className="flex-shrink-0 w-5 h-5 bg-blue-600 text-white rounded-full text-xs flex items-center justify-center mt-0.5">
                      1
                    </span>
                    <span>アカウントを作成またはログイン</span>
                  </div>
                  <div className="flex items-start space-x-2">
                    <span className="flex-shrink-0 w-5 h-5 bg-blue-600 text-white rounded-full text-xs flex items-center justify-center mt-0.5">
                      2
                    </span>
                    <span>表示名を入力して参加申請</span>
                  </div>
                  <div className="flex items-start space-x-2">
                    <span className="flex-shrink-0 w-5 h-5 bg-blue-600 text-white rounded-full text-xs flex items-center justify-center mt-0.5">
                      3
                    </span>
                    <span>管理者の承認後、チームメンバーになります</span>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <Button
                  onClick={() =>
                    (window.location.href = `/sign-up?redirect_url=${encodeURIComponent(window.location.href)}`)
                  }
                  className="w-full"
                  size="lg"
                >
                  🆕 新規アカウントを作成
                </Button>
                <Button
                  onClick={() =>
                    (window.location.href = `/sign-in?redirect_url=${encodeURIComponent(window.location.href)}`)
                  }
                  variant="outline"
                  className="w-full"
                  size="lg"
                >
                  🔑 既存アカウントでログイン
                </Button>
              </div>

              <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-md">
                <p className="text-amber-800 text-xs text-center">
                  ⚠️ 認証画面は英語で表示されますが、内容は同じです
                </p>
              </div>
            </div>
          ) : (
            /* 申請状態に応じた表示 */
            <div>
              {applicationStatus?.status === "member" ? (
                /* 既にメンバーの場合 */
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-green-900 mb-2">
                    ✅ チームメンバーです
                  </h3>
                  <p className="text-green-800 text-sm mb-2">
                    あなたは既にこのチームのメンバーです（
                    {applicationStatus.role}）
                  </p>
                  <Button
                    onClick={() => (window.location.href = "/team")}
                    className="w-full bg-green-600 hover:bg-green-700"
                  >
                    チーム画面へ移動
                  </Button>
                </div>
              ) : applicationStatus?.status === "pending" ? (
                /* 申請済みの場合 */
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-blue-900 mb-2">
                    📋 申請済みです
                  </h3>
                  <p className="text-blue-800 text-sm mb-3">
                    「{applicationStatus.displayName}
                    」として参加申請を送信済みです。
                    管理者の承認をお待ちください。
                  </p>
                  <div className="space-y-3">
                    <Button
                      onClick={() => (window.location.href = "/team")}
                      variant="outline"
                      className="w-full"
                    >
                      チーム画面へ戻る
                    </Button>
                  </div>
                </div>
              ) : (
                /* 未申請の場合 - 申請フォーム */
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label
                      htmlFor="displayName"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      表示名 *
                    </label>
                    <Input
                      id="displayName"
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="チームでの表示名を入力"
                      className="w-full"
                      required
                    />
                  </div>

                  {error && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                      <p className="text-red-800 text-sm">{error}</p>
                    </div>
                  )}

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={submitting}
                  >
                    {submitting ? "送信中..." : "参加を申請する"}
                  </Button>
                </form>
              )}
            </div>
          )}
        </Card>

        {/* 注意事項 */}
        <div className="text-center">
          <p className="text-xs text-gray-500">
            申請後、チーム管理者の承認をお待ちください。
          </p>
        </div>
      </div>
    </div>
  );
}
