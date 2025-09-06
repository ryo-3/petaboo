import { ClerkProvider } from "@clerk/nextjs";
import { jaJP } from "@clerk/localizations";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const clerkPublishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

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
