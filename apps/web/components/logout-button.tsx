"use client";

import { useClerk } from "@clerk/nextjs";
import { useRouter } from "next/navigation";

export default function LogoutButton() {
  const { signOut } = useClerk();
  const router = useRouter();

  return (
    <div className="rounded-full border border-red-400 mx-2 text-center cursor-pointer">
      <button
        onClick={async () => {
          await signOut();
          router.push("/"); // ログアウト後にルートへリダイレクト
        }}
        className=" text-red-600 hover:bg-red-50 mx-2 font-medium"
      >
        ログアウト
      </button>
    </div>
  );
}
