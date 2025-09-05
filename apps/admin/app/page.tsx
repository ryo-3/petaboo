"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AdminHome() {
  const router = useRouter();

  useEffect(() => {
    router.push("/users");
  }, [router]);

  return <div>リダイレクト中...</div>;
}