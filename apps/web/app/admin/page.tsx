"use client";

import { useAuth, useUser } from "@clerk/nextjs";
import { useState, useEffect } from "react";

export default function AdminPage() {
  const { getToken } = useAuth();
  const { user } = useUser();
  const [userInfo, setUserInfo] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // ユーザー情報取得
  const fetchUserInfo = async () => {
    try {
      const token = await getToken();
      const response = await fetch("http://localhost:8794/users/me", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      setUserInfo(data);
    } catch (error) {
      console.error("ユーザー情報取得エラー:", error);
    }
  };

  // プラン変更
  const changePlan = async (planType: "free" | "premium") => {
    setLoading(true);
    try {
      const token = await getToken();
      const response = await fetch("http://localhost:8794/users/plan", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ planType }),
      });
      
      console.log("Response status:", response.status);
      const data = await response.json();
      console.log("プラン変更結果:", data);
      
      if (!response.ok) {
        throw new Error(`API Error: ${response.status} - ${JSON.stringify(data)}`);
      }
      
      await fetchUserInfo(); // 最新情報を取得
    } catch (error) {
      console.error("プラン変更エラー:", error);
    } finally {
      setLoading(false);
    }
  };

  // チーム作成テスト
  const createTestTeam = async () => {
    setLoading(true);
    try {
      const token = await getToken();
      const response = await fetch("http://localhost:8794/teams", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: `テストチーム ${Date.now()}`,
          description: "管理者によるテスト用チーム",
        }),
      });
      const data = await response.json();
      console.log("チーム作成結果:", data);
    } catch (error) {
      console.error("チーム作成エラー:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserInfo();
  }, []);

  return (
    <div className="max-w-4xl mx-auto p-8">
      <h1 className="text-3xl font-bold mb-8">管理者ページ</h1>
      
      {/* ユーザー情報 */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">ユーザー情報</h2>
        <div className="space-y-2">
          <p><strong>Clerk ID:</strong> {user?.id}</p>
          <p><strong>メール:</strong> {user?.emailAddresses[0]?.emailAddress}</p>
          {userInfo && (
            <>
              <p><strong>プラン:</strong> 
                <span className={`ml-2 px-2 py-1 rounded text-sm ${
                  userInfo.planType === 'premium' 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {userInfo.planType}
                </span>
              </p>
              <p><strong>作成日:</strong> {new Date(userInfo.createdAt * 1000).toLocaleString()}</p>
            </>
          )}
        </div>
      </div>

      {/* プラン管理 */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">プラン管理</h2>
        <div className="flex gap-4">
          <button
            onClick={() => changePlan("free")}
            disabled={loading || userInfo?.planType === "free"}
            className="px-4 py-2 bg-gray-500 text-white rounded disabled:opacity-50"
          >
            Freeに変更
          </button>
          <button
            onClick={() => changePlan("premium")}
            disabled={loading || userInfo?.planType === "premium"}
            className="px-4 py-2 bg-green-500 text-white rounded disabled:opacity-50"
          >
            Premiumに変更
          </button>
        </div>
      </div>

      {/* チーム管理 */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">チーム管理</h2>
        <div className="flex gap-4">
          <button
            onClick={createTestTeam}
            disabled={loading}
            className="px-4 py-2 bg-blue-500 text-white rounded disabled:opacity-50"
          >
            テストチーム作成
          </button>
        </div>
      </div>

      {loading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-4 rounded-lg">処理中...</div>
        </div>
      )}
    </div>
  );
}