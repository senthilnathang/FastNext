import type { NextRequest } from "next/server";
import type { User } from "@/lib/graphql/types";

interface CreateContextOptions {
  req?: NextRequest;
  user?: User | null;
}

export async function createTRPCContext(opts?: CreateContextOptions) {
  const user = null;

  // Extract auth information from request headers
  if (opts?.req) {
    const authorization = opts.req.headers.get("authorization");
    if (authorization?.startsWith("Bearer ")) {
      // Add your auth logic here
      // For example, verify JWT token
      try {
        // const token = authorization.substring(7)
        // user = await verifyToken(token)
      } catch {
        // Invalid token
      }
    }
  }

  return {
    user,
    req: opts?.req,
  };
}

export type Context = Awaited<ReturnType<typeof createTRPCContext>>;
