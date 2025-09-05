// Next.js API Route - ブラウザからのfetch問題を回避するためのプロキシ
import { NextRequest, NextResponse } from "next/server";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:7594";

export async function GET(request: NextRequest) {
  try {
    console.log("🔄 Proxy API Route - GET /api/users");
    console.log("🌐 API_BASE_URL:", API_BASE_URL);
    console.log("🔧 NEXT_PUBLIC_API_URL:", process.env.NEXT_PUBLIC_API_URL);

    const response = await fetch(`${API_BASE_URL}/users`, {
      headers: {
        "x-admin-token": "petaboo_admin_dev_token_2025",
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      console.error("❌ Upstream API Error:", response.status);
      return NextResponse.json(
        { error: "Failed to fetch users" },
        { status: response.status },
      );
    }

    const data = await response.json();
    console.log("✅ Proxy API - Data retrieved:", data.length, "users");

    return NextResponse.json(data);
  } catch (error) {
    console.error("🚨 Proxy API Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
