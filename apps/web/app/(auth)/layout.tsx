import { ClerkProvider } from "@clerk/nextjs";
import { jaJP } from "@clerk/localizations";

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
    <ClerkProvider
      localization={jaJP}
      publishableKey={clerkPublishableKey || "pk_test_dummy"}
      signInUrl="/sign-in"
      signUpUrl="/sign-up"
      signInFallbackRedirectUrl="/"
      signUpFallbackRedirectUrl="/"
      afterSignOutUrl="/"
    >
      {children}
    </ClerkProvider>
  );
}
