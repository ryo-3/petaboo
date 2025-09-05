"use client";

import { useAuth, SignIn, UserButton } from "@clerk/nextjs";
import Main from "./main";

export default function ClientHome() {
  const { isLoaded, isSignedIn } = useAuth();

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
    return (
      <div className="relative">
        {/* 右上にログアウトボタン（開発用） */}
        <div className="absolute top-4 right-4 z-50">
          <UserButton afterSignOutUrl="/" />
        </div>
        <Main />
      </div>
    );
  }

  // 未ログイン時はログインフォームを埋め込んだウェルカムページを表示
  return (
    <main className="flex flex-col items-center justify-center min-h-screen gap-8 px-6 bg-gradient-to-b from-gray-50 to-white py-12">
      <div>
        <h1 className="text-4xl sm:text-5xl font-extrabold bg-gradient-to-r from-purple-600 via-indigo-500 to-blue-500 text-transparent bg-clip-text">
          メモ帳へようこそ
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
            }
          }}
        />
      </div>
    </main>
  );
}