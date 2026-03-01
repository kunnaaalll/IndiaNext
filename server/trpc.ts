// tRPC Server Setup
//
// ARCHITECTURE NOTE:
// ─────────────────────────────────────────────────────────────
// This project uses TWO API layers by design:
//
// 1. REST (/api/send-otp, /api/verify-otp, /api/register)
//    → Public registration flow. OTP-based, no session required.
//    → Used by: HackathonForm.tsx (participant-facing)
//
// 2. tRPC (/api/trpc/*)
//    → Authenticated admin panel + post-registration management.
//    → Used by: /admin/* pages, future team dashboard
//    → Routers: admin (dashboard/teams/export), auth (profile/notifications),
//               team (submission updates, withdraw)
//
// These are NOT duplicate systems — they serve different auth models.
// ─────────────────────────────────────────────────────────────

import { initTRPC, TRPCError } from "@trpc/server";
import { type FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch";
import superjson from "superjson";
import { ZodError } from "zod";
import { prisma } from "@/lib/prisma";

/**
 * Parse cookies from a raw Cookie header string.
 */
function parseCookies(cookieHeader: string | null): Record<string, string> {
  if (!cookieHeader) return {};
  return Object.fromEntries(
    cookieHeader.split(';').map((c) => {
      const [key, ...rest] = c.trim().split('=');
      return [key, rest.join('=')];
    })
  );
}

// Create context for each request (App Router / Fetch adapter)
export async function createContext(opts: FetchCreateContextFnOptions) {
  // Read session token ONLY from HttpOnly cookie — never from Authorization header.
  // Accepting tokens via headers would bypass SameSite/HttpOnly cookie protections.
  const cookies = parseCookies(opts.req.headers.get('cookie'));

  let session = null;
  let adminSession = null;

  // Check participant session
  const userToken = cookies.session_token || null;
  if (userToken) {
    const sessionData = await prisma.session.findUnique({
      where: { token: userToken },
      include: { user: true },
    });

    if (sessionData && sessionData.expiresAt > new Date()) {
      session = {
        user: sessionData.user,
        token: sessionData.token,
      };
    }
  }

  // Check admin session (separate table)
  const adminToken = cookies.admin_token || null;
  if (adminToken) {
    const adminData = await prisma.adminSession.findUnique({
      where: { token: adminToken },
      include: { admin: true },
    });

    if (adminData && adminData.expiresAt > new Date() && adminData.admin.isActive) {
      adminSession = {
        admin: adminData.admin,
        token: adminData.token,
      };
    }
  }

  return {
    session,
    adminSession,
    prisma,
    req: opts.req,
    resHeaders: opts.resHeaders,
  };
}

type Context = Awaited<ReturnType<typeof createContext>>;

// Initialize tRPC with enhanced error formatting
const t = initTRPC.context<Context>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    // Enhanced error formatting with more details
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:
          error.cause instanceof ZodError ? error.cause.flatten() : null,
        timestamp: new Date().toISOString(),
        // Include stack trace in development
        ...(process.env.NODE_ENV === 'development' && {
          stack: error.stack,
        }),
      },
    };
  },
});

// Export reusable router and procedure helpers
export const router = t.router;
export const publicProcedure = t.procedure;

// Auth middleware
const isAuthed = t.middleware(({ ctx, next }) => {
  if (!ctx.session?.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Not authenticated" });
  }
  return next({
    ctx: {
      session: { ...ctx.session, user: ctx.session.user },
    },
  });
});

// Admin middleware — checks admin_token cookie → Admin table
const isAdmin = t.middleware(({ ctx, next }) => {
  if (!ctx.adminSession?.admin) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Admin access required" });
  }
  
  return next({
    ctx: {
      ...ctx,
      admin: ctx.adminSession.admin,
    },
  });
});

// Protected procedures
export const protectedProcedure = t.procedure.use(isAuthed);
export const adminProcedure = t.procedure.use(isAdmin);
