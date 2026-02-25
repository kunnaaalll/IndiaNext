# Admin Panel — Implementation Guide

> **Companion to:** `Documents/ADMIN_PANEL_SYSTEM_DESIGN.md`
> **Last Updated:** 2026-02-22
> **Current Phase:** Phase 0 (Critical Fixes) → Phase 1 (Admin Login + Dashboard)

---

## What Exists vs. What the Previous Guide Claimed

The original guide had several inaccuracies. Here is the corrected status:

| Claimed | Reality |
|---------|---------|
| `server/routers/admin-teams.ts` exists | ❌ Doesn't exist. Teams logic is in `server/routers/admin.ts` |
| `server/routers/admin-dashboard.ts` needed | ❌ Dashboard stats already in `admin.ts` (`getStats`, `getAnalytics`) |
| Next.js 14 | ❌ Actual version is **16.1.6** |
| Shadcn UI "already installed" | ❌ Only `button.tsx` exists. No table, dialog, badge, etc. |
| `@tanstack/react-table` installed | ❌ Not in `package.json` |
| `recharts` installed | ❌ Not in `package.json` |
| "No additional migrations needed" | ❌ Need to add `password` field to User model |
| Admin login page exists | ❌ Not built. Layout redirects to `/login` which doesn't exist |
| `hashPassword` importable from `lib/auth` | ❌ No such function exists |

---

## Phase 0 — Critical Fixes (Do First)

These fixes resolve bugs and blockers in the existing code. No new features.

### 0.1 Delete Stale Schema

```bash
rm prisma/schema-complete.prisma
```

It diverges from `schema.prisma` on `TeamMember` uniqueness constraints and is never referenced by `prisma.config.ts`.

### 0.2 Add Password Field to User Model

In `prisma/schema.prisma`, add to the User model:

```prisma
model User {
  // ... existing fields ...
  
  // Auth & Security
  password      String?   // bcrypt hash — only for admin/organizer, participants use OTP
  emailVerified Boolean   @default(false)
  // ... rest ...
}
```

Then run:
```bash
npx prisma db push
# or: npx prisma migrate dev --name add_user_password
```

### 0.3 Install bcryptjs

```bash
npm install bcryptjs
npm install -D @types/bcryptjs
```

Using `bcryptjs` (pure JS) instead of `bcrypt` (native) because it works on Vercel Edge/Node without native compilation.

### 0.4 Fix Cookie Name in auth-admin.ts

In `lib/auth-admin.ts`, change:

```typescript
// BEFORE (broken):
const sessionToken = cookieStore.get('admin_session')?.value;

// AFTER (correct — matches server/trpc.ts and lib/auth.ts):
const sessionToken = cookieStore.get('session_token')?.value;
```

### 0.5 Fix updateTeamStatus Race Condition

In `server/routers/admin.ts`, the `updateTeamStatus` mutation must read the current status **before** updating:

```typescript
// BEFORE (bug — team.status is already the new status):
metadata: { status: input.status, previousStatus: team.status }

// AFTER (correct):
const existing = await ctx.prisma.team.findUnique({
  where: { id: input.teamId },
  select: { status: true },
});

const team = await ctx.prisma.team.update({ ... });

await ctx.prisma.activityLog.create({
  data: {
    // ...
    metadata: { status: input.status, previousStatus: existing?.status },
  },
});
```

### 0.6 Add Notifications to bulkUpdateStatus

In `server/routers/admin.ts`, after the `updateMany` and `createMany` for activity logs, add:

```typescript
// Fetch affected teams with their members
const affectedTeams = await ctx.prisma.team.findMany({
  where: { id: { in: input.teamIds } },
  select: {
    id: true,
    name: true,
    members: { select: { userId: true } },
  },
});

// Batch create notifications
const notifications = affectedTeams.flatMap(team =>
  team.members.map(member => ({
    userId: member.userId,
    type: "STATUS_UPDATE" as const,
    title: "Team Status Updated",
    message: `Your team "${team.name}" status has been changed to ${input.status}`,
    link: `/team/${team.id}`,
  }))
);

if (notifications.length > 0) {
  await ctx.prisma.notification.createMany({ data: notifications });
}
```

---

## Phase 1 — Admin Login + Dashboard

### 1.1 Install Dependencies

```bash
npm install bcryptjs recharts @tanstack/react-table date-fns
npm install -D @types/bcryptjs
```

### 1.2 Install Shadcn UI Components

```bash
npx shadcn@latest add table dialog dropdown-menu select checkbox badge avatar tabs card separator command popover
```

### 1.3 Create Admin Login Page

**File:** `app/admin/login/page.tsx`

Key requirements:
- Client component with email + password form
- POST to `/api/admin/login` (REST route, not tRPC — no session exists yet)
- On success: cookie is set server-side, redirect to `/admin`
- On failure: show error message
- Rate limit: 5 attempts per 15 minutes per IP (use existing rate-limit.ts)

### 1.4 Create Admin Login API Route

**File:** `app/api/admin/login/route.ts`

```typescript
// Pseudocode:
1. Validate input (email + password) with Zod
2. Rate limit by IP
3. Find user by email
4. Verify password with bcryptjs.compare()
5. Check role >= ORGANIZER
6. Create session in DB
7. Set session_token HttpOnly cookie (SameSite=Lax, Secure in prod)
8. Log activity
9. Return success
```

### 1.5 Create Admin Seed Script

**File:** `scripts/create-admin.ts`

```typescript
import { prisma } from '../lib/prisma';
import bcrypt from 'bcryptjs';

async function main() {
  const email = process.argv[2] || 'admin@indianext.in';
  const password = process.argv[3] || 'ChangeMeOnFirstLogin!';

  const hash = await bcrypt.hash(password, 12);

  const user = await prisma.user.upsert({
    where: { email },
    update: { password: hash, role: 'ADMIN' },
    create: {
      email,
      name: 'Admin',
      password: hash,
      role: 'ADMIN',
      emailVerified: true,
    },
  });

  console.log(`Admin user created/updated: ${user.email} (${user.role})`);
}

main().catch(console.error);
```

Run: `npx tsx scripts/create-admin.ts admin@indianext.in YourSecurePassword123!`

### 1.6 Wire Dashboard Charts

Replace placeholder chart components with real `recharts` implementations:

- `components/admin/dashboard/RegistrationChart.tsx` → `<LineChart>` from recharts
- `components/admin/dashboard/TrackDistribution.tsx` → `<PieChart>` from recharts
- `components/admin/dashboard/TopColleges.tsx` → `<BarChart>` from recharts

### 1.7 Update Admin Layout Redirect

In `app/admin/layout.tsx`, change:

```typescript
// BEFORE:
redirect("/login?redirect=/admin");

// AFTER:
redirect("/admin/login");
```

---

## Phase 2 — Team Detail + Email Campaigns

### 2.1 Team Detail Page

**File:** `app/admin/teams/[id]/page.tsx`

Sections:
1. **Header:** Team name, track badge, status badge, created date
2. **Members table:** Name, email, phone, college, degree, role (Leader/Member)
3. **Submission:** Track-specific fields (IdeaSprint vs BuildStorm)
4. **Review panel:** Status selector + notes textarea + confirm button
5. **Comments:** List + add form (with `isInternal` toggle)
6. **Activity timeline:** Ordered by createdAt desc
7. **Tags:** Add/remove with color picker

### 2.2 Email Campaign Router

**File:** `server/routers/admin-email.ts`

```typescript
// Procedures:
createCampaign    → Create draft campaign with subject/body/filters
getCampaigns      → List all campaigns with stats
getCampaignById   → Single campaign detail
updateCampaign    → Edit draft campaign
sendCampaign      → Queue and send (uses after() for post-response)
deleteCampaign    → Soft delete
getTemplates      → Saved template library
```

Register in `server/routers/_app.ts`:
```typescript
import { emailRouter } from "./admin-email";
// ...
export const appRouter = router({
  admin: adminRouter,
  email: emailRouter,  // new
  team: teamRouter,
  auth: authRouter,
});
```

### 2.3 Schema Migration for Campaign Tracking

Add to `prisma/schema.prisma`:

```prisma
model EmailLog {
  // ... existing fields ...
  campaignId  String?
  campaign    EmailCampaign? @relation(fields: [campaignId], references: [id])
}

model EmailCampaign {
  // ... existing fields ...
  emails      EmailLog[]    // Add this relation
}
```

---

## Phase 3 — Production Hardening

### 3.1 Rate Limit Admin Routes

Add a per-user rate limiter in `server/trpc.ts`:

```typescript
const adminRateLimit = t.middleware(async ({ ctx, next }) => {
  if (ctx.session?.user) {
    const key = `admin:${ctx.session.user.id}`;
    const result = await slidingWindowCheck(key, 100, 60); // 100 req/min
    if (!result.success) {
      throw new TRPCError({ code: "TOO_MANY_REQUESTS" });
    }
  }
  return next({ ctx });
});
```

### 3.2 Request Correlation IDs

In `middleware.ts`, add:

```typescript
const requestId = crypto.randomUUID();
response.headers.set('X-Request-Id', requestId);
```

### 3.3 Session Cleanup

**Option A — Vercel Cron:** Add to `vercel.json`:
```json
{
  "crons": [{
    "path": "/api/cron/cleanup-sessions",
    "schedule": "0 3 * * *"
  }]
}
```

**Option B — Inline cleanup:** In `getSession()`, periodically delete expired sessions:
```typescript
// 1% chance per request to clean up
if (Math.random() < 0.01) {
  prisma.session.deleteMany({ where: { expiresAt: { lt: new Date() } } }).catch(() => {});
}
```

### 3.4 Connection Pool Config

In `lib/prisma.ts`:

```typescript
const pool = new Pool({
  connectionString,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});
```

---

## File Structure Summary

```
app/admin/
├── layout.tsx              ✅ Exists — server auth guard
├── page.tsx                ✅ Exists — dashboard (needs recharts)
├── login/
│   └── page.tsx            ❌ TODO Phase 1
├── teams/
│   ├── page.tsx            ✅ Exists — list view
│   └── [id]/
│       └── page.tsx        ❌ TODO Phase 2
├── email/
│   └── page.tsx            ❌ TODO Phase 2
├── reports/
│   └── page.tsx            ❌ TODO Phase 4
└── users/
    └── page.tsx            ❌ TODO Phase 4

server/routers/
├── _app.ts                 ✅ App router
├── admin.ts                ✅ 713 lines — stats, teams, tags, analytics, users, export
├── admin-email.ts          ❌ TODO Phase 2
├── team.ts                 ✅ Participant team management
└── auth.ts                 ✅ Profile, logout, notifications

lib/
├── auth.ts                 ✅ Session helpers
├── auth-admin.ts           ✅ RBAC + permissions (needs cookie fix)
├── prisma.ts               ✅ PrismaClient with pg adapter
├── email.ts                ✅ Resend email service
├── rate-limit.ts           ✅ Sliding window
└── trpc-client.ts          ✅ Client-side tRPC hooks

components/admin/
├── AdminHeader.tsx          ✅
├── AdminSidebar.tsx         ✅
├── dashboard/
│   ├── StatsCards.tsx       ✅ Shell
│   ├── RegistrationChart.tsx ✅ Shell (needs recharts)
│   ├── TrackDistribution.tsx ✅ Shell
│   ├── TopColleges.tsx      ✅ Shell
│   └── RecentActivity.tsx   ✅ Shell
└── teams/
    ├── TeamsTable.tsx       ✅ Shell
    ├── TeamsFilters.tsx     ✅ Shell
    └── BulkActions.tsx      ✅ Shell
```

---

## Priority Order

| # | Task | Impact | Effort |
|---|------|--------|--------|
| 1 | Fix cookie name mismatch | Unblocks auth-admin.ts | 5 min |
| 2 | Fix updateTeamStatus race condition | Data integrity | 10 min |
| 3 | Add notifications to bulkUpdateStatus | Feature parity | 15 min |
| 4 | Delete schema-complete.prisma | Remove confusion | 1 min |
| 5 | Add User.password + install bcryptjs | Unblocks login | 15 min |
| 6 | Build admin login page + API | **Unblocks entire admin panel** | 2-3 hours |
| 7 | Install recharts + wire charts | Dashboard becomes functional | 2-3 hours |
| 8 | Install Shadcn UI components | Teams page becomes functional | 1 hour |
| 9 | Build team detail page | Core admin workflow | 3-4 hours |
| 10 | Build email campaign system | Communication tool | 4-6 hours |

---

## Environment Variables

```env
# Required
DATABASE_URL=postgresql://...
RESEND_API_KEY=<your-key-here>
UPSTASH_REDIS_URL=https://...
UPSTASH_REDIS_TOKEN=<your-token-here>
NEXT_PUBLIC_APP_URL=https://india-next-one.vercel.app
EMAIL_FROM=hackathon@kessc.edu.in

# Optional
ADMIN_SESSION_DURATION=28800000
```

> **NEVER commit real API keys to docs or source control.** Use `.env.local` for local dev.

---

*End of Implementation Guide*
