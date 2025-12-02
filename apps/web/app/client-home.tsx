"use client";

import { useEffect, useRef } from "react";
import { useAuth, SignIn, UserButton } from "@clerk/nextjs";
import { useSearchParams } from "next/navigation";
import Main from "./main";

export default function ClientHome() {
  const { isLoaded, isSignedIn } = useAuth();
  const searchParams = useSearchParams();

  // URLパラメータからモードを取得
  // 旧形式: ?mode=memo, 新形式: ?memo（値なし）
  const modeParam = searchParams.get("mode") as
    | "memo"
    | "task"
    | "board"
    | null;

  // 新形式のモード取得（?memo, ?task, ?boards）
  const getModeFromParams = (): "memo" | "task" | "board" | null => {
    if (searchParams.has("memo")) return "memo";
    if (searchParams.has("task")) return "task";
    if (searchParams.has("boards")) return "board";
    return null;
  };
  const newModeParam = getModeFromParams();

  // URLクエリパラメータからボードslugを取得（チーム側と同じ形式）
  // ?TEST 形式（値が空のキー）をボードslugとして扱う
  const getBoardSlugFromURL = (): string | null => {
    // 除外するキー（モード指定やシステムパラメータ）
    const excludeKeys = [
      "mode",
      "search",
      "memo",
      "task",
      "boards",
      "settings",
    ];
    for (const [key, value] of searchParams.entries()) {
      if (value === "" && !excludeKeys.includes(key)) {
        return key.toUpperCase();
      }
    }
    return null;
  };

  const boardSlug = getBoardSlugFromURL();

  // 新形式または旧形式のモードを統合
  const effectiveMode = newModeParam || modeParam;

  // 初回のみモードを記憶
  const initialMode = useRef(effectiveMode);

  useEffect(() => {
    // 旧形式（?mode=xxx）の場合のみURLをクリア
    // 新形式（?memo, ?task, ?boards）はURLを維持する
    if (modeParam && !newModeParam && isSignedIn && !boardSlug) {
      window.history.replaceState(null, "", "/");
    }
  }, [modeParam, newModeParam, isSignedIn, boardSlug]);

  // 認証状態が読み込まれていない間はローディング表示
  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  // ログイン済みならメイン画面を表示
  // 常に同じMainコンポーネントを返す（URLが変わってもアンマウントしない）
  // boardSlugはmain-client.tsx内でsearchParamsから直接取得する
  if (isSignedIn) {
    // 初回のモードを使用（URLから消した後も維持）
    const mode = initialMode.current;
    return (
      <Main
        initialCurrentMode={boardSlug ? "board" : mode || undefined}
        initialScreenMode={boardSlug ? "board" : mode || undefined}
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
