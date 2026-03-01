// Main tRPC App Router
//
// admin → Dashboard stats, team management, export (used by /admin/* pages)
// auth   → Profile, notifications, session management (post-registration)
// team   → Submission updates, submit for review, withdraw (post-registration)
//
import { router } from "../trpc";
import { adminRouter } from "./admin";
import { teamRouter } from "./team";
import { authRouter } from "./auth";
import { judgeRouter } from "./judge";
import { criteriaRouter } from "./criteria";

export const appRouter = router({
  admin: adminRouter,
  team: teamRouter,
  auth: authRouter,
  judge: judgeRouter,
  criteria: criteriaRouter,
});

export type AppRouter = typeof appRouter;
