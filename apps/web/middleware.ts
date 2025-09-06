import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// 本当に公開すべきルートのみを指定
const isPublicRoute = createRouteMatcher([
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/join/(.*)",
  "/api/browser-log",
]);

export default clerkMiddleware(async (auth, req) => {
  // ホームページは特別扱い - page.tsx内で認証チェック
  const isHomePage = req.nextUrl.pathname === "/";

  if (!isPublicRoute(req) && !isHomePage) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
