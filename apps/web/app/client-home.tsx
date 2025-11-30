"use client";

import { useEffect, useRef } from "react";
import { useAuth, SignIn, UserButton } from "@clerk/nextjs";
import { useSearchParams } from "next/navigation";
import Main from "./main";

export default function ClientHome() {
  const { isLoaded, isSignedIn } = useAuth();
  const searchParams = useSearchParams();

  // URLパラメータからモードを取得
  const modeParam = searchParams.get("mode") as
    | "memo"
    | "task"
    | "board"
    | null;

  // 初回のみモードを記憶し、URLからパラメータを消す
  const initialMode = useRef(modeParam);

  useEffect(() => {
    if (modeParam && isSignedIn) {
      // URLからmodeパラメータを即座に消す（再レンダリングなし）
      window.history.replaceState(null, "", "/");
    }
  }, [modeParam, isSignedIn]);

  // 認証状態が読み込まれていない間はローディング表示
  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  // ログイン済みならメイン画面を表示
  if (isSignedIn) {
    // 初回のモードを使用（URLから消した後も維持）
    const mode = initialMode.current;
    return (
      <Main
        initialCurrentMode={mode || undefined}
        initialScreenMode={mode || undefined}
      />
    );
  }

  // 未ログイン時はログインフォームを埋め込んだウェルカムページを表示
  return (
    <main className="flex flex-col items-center justify-center min-h-screen gap-8 px-6 bg-gradient-to-b from-gray-50 to-white py-12">
      <div>
        <h1 className="text-4xl sm:text-5xl font-extrabold bg-gradient-to-r from-purple-600 via-indigo-500 to-blue-500 text-transparent bg-clip-text">
          ぺたぼーへようこそ
        </h1>
        <p className="text-gray-600 mt-3 text-base sm:text-lg">
          あなたのアイデアを、どこでもすぐに記録。
        </p>
      </div>

      {/* Clerkのログインコンポーネントを直接埋め込み */}
      <div className="w-full max-w-md">
        <SignIn
          routing="hash"
          signUpUrl="/sign-up"
          appearance={{
            elements: {
              rootBox: "mx-auto",
              card: "shadow-lg rounded-lg",
            },
          }}
        />
      </div>
    </main>
  );
}
