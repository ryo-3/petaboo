"use client";

import { useClerk } from "@clerk/nextjs";
import { useRouter } from "next/navigation";

export default function LogoutButton() {
  const { signOut } = useClerk();
  const router = useRouter();

  return (
    <button
      onClick={async () => {
        await signOut();
        router.push("/"); // ログアウト後にルートへリダイレクト
      }}
      className="rounded-full border border-red-400 text-red-600 px-4 py-2 hover:bg-red-50"
    >
      ログアウト
    </button>
  );
}
