import { ClerkProvider } from "@clerk/nextjs";
import { jaJP } from "@clerk/localizations";
import { Suspense } from "react";
import GlobalNotificationProvider from "@/components/providers/global-notification-provider";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const clerkPublishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

  // 本番環境でClerk環境変数が存在しない場合、ClerkProviderなしで返す
  if (!clerkPublishableKey && process.env.NODE_ENV === "production") {
    return children;
  }

  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      }
    >
      <ClerkProvider
        dynamic
        localization={jaJP}
        publishableKey={clerkPublishableKey || "pk_test_dummy"}
        signInUrl="/sign-in"
        signUpUrl="/sign-up"
        signInFallbackRedirectUrl="/"
        signUpFallbackRedirectUrl="/"
        afterSignOutUrl="/"
      >
        <GlobalNotificationProvider>{children}</GlobalNotificationProvider>
      </ClerkProvider>
    </Suspense>
  );
}
