// tRPC API Route Handler for Next.js App Router
//
// Serves authenticated endpoints for the admin panel & post-registration features.
// Public registration uses REST (/api/send-otp, /api/verify-otp, /api/register).
//
// See server/trpc.ts for full architecture notes.

import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
import { appRouter } from '@/server/routers/_app';
import { createContext } from '@/server/trpc';

const handler = (req: Request) =>
  fetchRequestHandler({
    endpoint: '/api/trpc',
    req,
    router: appRouter,
    createContext,
    onError: ({ path, error }) => {
      console.error(`❌ tRPC failed on ${path ?? '<no-path>'}: ${error.code} - ${error.message}`);
      if (error.cause) console.error('  Cause:', error.cause);
    },
  });

export { handler as GET, handler as POST };
