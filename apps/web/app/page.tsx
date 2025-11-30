import { Suspense } from "react";
import ClientHome from "./client-home";

// クライアントサイドでの認証チェックに変更
export default function HomePage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-screen">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      }
    >
      <ClientHome />
    </Suspense>
  );
}
