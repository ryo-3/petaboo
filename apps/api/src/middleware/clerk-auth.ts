import { createMiddleware } from "hono/factory";
import jwt from "@tsndr/cloudflare-worker-jwt";

type AuthVariables = {
  userId: string;
  user: any;
};

export const clerkAuth = createMiddleware<{
  Bindings: { CLERK_SECRET_KEY: string };
  Variables: AuthVariables;
}>(async (c, next) => {
  const authHeader = c.req.header("Authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const token = authHeader.slice(7); // Remove "Bearer " prefix

  try {
    // Clerk JWTを検証
    const isValid = await jwt.verify(token, c.env.CLERK_SECRET_KEY);

    if (!isValid) {
      return c.json({ error: "Invalid token" }, 401);
    }

    const payload = jwt.decode(token);

    if (!payload.payload || !payload.payload.sub) {
      return c.json({ error: "Invalid token payload" }, 401);
    }

    c.set("userId", payload.payload.sub);
    c.set("user", payload.payload);

    await next();
  } catch (error) {
    console.error("Auth error:", error);
    return c.json({ error: "Authentication failed" }, 401);
  }
});

// オプショナル認証（認証なしでも通す）
export const optionalAuth = createMiddleware<{
  Bindings: { CLERK_SECRET_KEY: string };
  Variables: Partial<AuthVariables>;
}>(async (c, next) => {
  const authHeader = c.req.header("Authorization");

  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.slice(7);

    try {
      const isValid = await jwt.verify(token, c.env.CLERK_SECRET_KEY);

      if (isValid) {
        const payload = jwt.decode(token);

        if (payload.payload && payload.payload.sub) {
          c.set("userId", payload.payload.sub);
          c.set("user", payload.payload);
        }
      }
    } catch (error) {
      console.error("Optional auth error:", error);
      // エラーでも続行
    }
  }

  await next();
});
