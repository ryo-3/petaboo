import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  // ローカルアクセス制限が有効かチェック
  const localAccessOnly = process.env.LOCAL_ACCESS_ONLY === "true";
  
  if (!localAccessOnly) {
    // 制限が無効の場合はそのまま通す
    return NextResponse.next();
  }
  
  // IPアドレスを取得
  const forwardedFor = request.headers.get("x-forwarded-for");
  const realIp = request.headers.get("x-real-ip");
  const host = request.headers.get("host");
  const ip = forwardedFor?.split(",")[0] || realIp || "unknown";
  
  // ローカルアクセスかチェック
  const isLocalhost = host?.includes("localhost") || host?.includes("127.0.0.1") || host?.includes("[::1]");
  const localIpPatterns = [
    "127.0.0.1",
    "::1",
    "localhost",
    "::ffff:127.0.0.1",
    "10.255.255.254", // WSL環境のIP
    "172.16.", // Docker内部ネットワーク
    "192.168.", // プライベートネットワーク
    "10.", // プライベートネットワーク
  ];
  
  const isLocalIp = localIpPatterns.some(pattern => ip.includes(pattern));
  
  // ローカル以外からのアクセスをブロック
  if (!isLocalhost && !isLocalIp) {
    console.log(`[Admin] アクセス拒否: IP=${ip}, URL=${request.url}`);
    
    return new NextResponse("403 Forbidden - このページはローカル環境からのみアクセス可能です", {
      status: 403,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
      },
    });
  }
  
  // アクセスログ
  console.log(`[Admin] アクセス許可: IP=${ip}, URL=${request.url}`);
  
  return NextResponse.next();
}

// 管理画面のすべてのルートに適用
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};