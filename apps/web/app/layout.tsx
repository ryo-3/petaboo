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
import { PageVisibilityProvider } from "@/src/contexts/PageVisibilityContext";
import { LogCleaner } from "@/components/dev/log-cleaner";

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
  title: "ぺたぼー",
  description: "個人・チーム向け統合メモ・タスク管理システム PETABoo",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // サーバーサイドで設定を事前取得
  const initialPreferences = await getServerUserPreferences(1);

  const clerkPublishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

  const content = (
    <html lang="ja">
      <head>
        {process.env.NODE_ENV === "development" && (
          <script src="/console-logger.js" />
        )}
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-white text-gray-900 min-h-screen`}
      >
        <QueryProvider>
          <PageVisibilityProvider>
            <UserPreferencesProvider initialPreferences={initialPreferences}>
              <ToastProvider>
                <SelectorProvider>
                  {clerkPublishableKey && <UserInitializer />}
                  <LogCleaner />
                  {children}
                  <ToastContainer />
                </SelectorProvider>
              </ToastProvider>
            </UserPreferencesProvider>
          </PageVisibilityProvider>
        </QueryProvider>
      </body>
    </html>
  );

  // 本番環境でClerk環境変数が存在しない場合、ClerkProviderなしで返す
  if (!clerkPublishableKey && process.env.NODE_ENV === "production") {
    return content;
  }

  return (
    <ClerkProvider
      localization={jaJP}
      publishableKey={clerkPublishableKey || "pk_test_dummy"}
      signInUrl="/sign-in"
      signUpUrl="/sign-up"
      afterSignOutUrl="/"
      appearance={{
        variables: {
          colorPrimary: "#3B82F6",
        },
        elements: {
          rootBox: "mx-auto",
          card: "shadow-lg",
        },
      }}
    >
      {content}
    </ClerkProvider>
  );
}
