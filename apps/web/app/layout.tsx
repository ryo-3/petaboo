import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { QueryProvider } from "@/src/lib/query-client";
import { ToastProvider } from "@/src/contexts/toast-context";
import { ToastContainer } from "@/components/ui/toast/toast-container";
import { UserPreferencesProvider } from "@/src/contexts/user-preferences-context";
import { getServerUserPreferences } from "@/src/lib/server-preferences";
import { SelectorProvider } from "@/src/contexts/selector-context";
import { UserInitializer } from "@/components/auth/user-initializer";

import { jaJP } from "@clerk/localizations";
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "メモ帳アプリ",
  description: "Clerk認証付きメモ帳アプリ",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // サーバーサイドで設定を事前取得
  const initialPreferences = await getServerUserPreferences(1);

  return (
    <ClerkProvider localization={jaJP}>
      <html lang="ja">
        <head>
          {process.env.NODE_ENV === 'development' && (
            <script src="/console-logger.js" />
          )}
        </head>
        <body
          className={`${geistSans.variable} ${geistMono.variable} antialiased bg-white text-gray-900 min-h-screen`}
        >
          <QueryProvider>
            <UserPreferencesProvider initialPreferences={initialPreferences}>
              <ToastProvider>
                <SelectorProvider>
                  <UserInitializer />
                  {children}
                  <ToastContainer />
                </SelectorProvider>
              </ToastProvider>
            </UserPreferencesProvider>
          </QueryProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
