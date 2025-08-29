"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useParams } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import TeamIcon from "@/components/icons/team-icon";

interface InvitationData {
  id: number;
  teamName: string;
  inviterEmail: string;
  role: "admin" | "member";
  expiresAt: number;
}

export default function JoinTeamPage() {
  const router = useRouter();
  const params = useParams();
  const token = params.token as string;

  const [invitation, setInvitation] = useState<InvitationData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const fetchInvitation = async () => {
      try {
        const response = await fetch(`/api/teams/invite/${token}`);

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || "招待情報を取得できませんでした");
        }

        const data = await response.json();
        setInvitation(data);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "招待情報を取得できませんでした",
        );
      } finally {
        setIsLoading(false);
      }
    };

    if (token) {
      fetchInvitation();
    }
  }, [token]);

  const handleJoinTeam = async () => {
    if (!invitation) return;

    setIsJoining(true);
    try {
      const response = await fetch(`/api/teams/invite/${token}/accept`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "チームへの参加に失敗しました");
      }

      setSuccess(true);
      setTimeout(() => {
        router.push(`/team/${invitation.id}`);
      }, 2000);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "チームへの参加に失敗しました",
      );
    } finally {
      setIsJoining(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">招待情報を確認中...</p>
        </div>
      </div>
    );
  }

  if (error || !invitation) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md mx-auto p-8 text-center">
          <div className="text-red-500 mb-4">
            <TeamIcon className="w-12 h-12 mx-auto" />
          </div>
          <h1 className="text-xl font-semibold text-gray-900 mb-4">
            招待が無効です
          </h1>
          <p className="text-gray-600 mb-6">
            {error || "この招待リンクは無効または期限切れです。"}
          </p>
          <Button onClick={() => router.push("/team")} variant="outline">
            チーム一覧に戻る
          </Button>
        </Card>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md mx-auto p-8 text-center">
          <div className="text-green-500 mb-4">
            <TeamIcon className="w-12 h-12 mx-auto" />
          </div>
          <h1 className="text-xl font-semibold text-gray-900 mb-4">
            チームに参加しました！
          </h1>
          <p className="text-gray-600 mb-6">
            「{invitation.teamName}」チームのメンバーになりました。
            チーム詳細ページに移動しています...
          </p>
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
        </Card>
      </div>
    );
  }

  const isExpired = invitation.expiresAt * 1000 < Date.now();

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <Card className="max-w-md mx-auto p-8">
        <div className="text-center mb-6">
          <TeamIcon className="w-12 h-12 mx-auto text-blue-600 mb-4" />
          <h1 className="text-2xl font-semibold text-gray-900 mb-2">
            チーム招待
          </h1>
          <p className="text-gray-600">
            チーム「{invitation.teamName}」に招待されています
          </p>
        </div>

        {isExpired ? (
          <div className="text-center">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <p className="text-red-800 text-sm">この招待は期限切れです</p>
            </div>
            <Button onClick={() => router.push("/team")} variant="outline">
              チーム一覧に戻る
            </Button>
          </div>
        ) : (
          <>
            <div className="bg-gray-50 rounded-lg p-4 mb-6 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">招待者:</span>
                <span className="font-medium">{invitation.inviterEmail}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">役割:</span>
                <span
                  className={`font-medium ${
                    invitation.role === "admin"
                      ? "text-blue-600"
                      : "text-gray-700"
                  }`}
                >
                  {invitation.role === "admin" ? "管理者" : "メンバー"}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">有効期限:</span>
                <span className="font-medium">
                  {new Date(invitation.expiresAt * 1000).toLocaleDateString(
                    "ja-JP",
                  )}
                </span>
              </div>
            </div>

            <div className="space-y-3">
              <Button
                onClick={handleJoinTeam}
                disabled={isJoining}
                className="w-full"
              >
                {isJoining ? "参加中..." : "チームに参加する"}
              </Button>
              <Button
                onClick={() => router.push("/team")}
                variant="outline"
                className="w-full"
                disabled={isJoining}
              >
                キャンセル
              </Button>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
