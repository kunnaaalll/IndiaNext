# Admin Panel — System Design Document

> **Project:** IndiaNext Hackathon Platform
> **Stack:** Next.js 16.1.6, tRPC 11, Prisma 7.4, PostgreSQL (Neon), Tailwind CSS 4, Vercel
> **Last Updated:** 2026-02-22
> **Status:** Phase 1 — partially implemented (see Implementation Status)

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Implementation Status](#2-implementation-status)
3. [Authentication & Authorization](#3-authentication--authorization)
4. [Database Design](#4-database-design)
5. [API Layer (tRPC)](#5-api-layer-trpc)
6. [Admin Dashboard](#6-admin-dashboard)
7. [Teams Management](#7-teams-management)
8. [Approval / Rejection Workflow](#8-approval--rejection-workflow)
9. [Email Campaign System](#9-email-campaign-system)
10. [Reports & Export](#10-reports--export)
11. [Search & Filtering](#11-search--filtering)
12. [Security](#12-security)
13. [Performance](#13-performance)
14. [Observability](#14-observability)
15. [Known Issues & Required Fixes](#15-known-issues--required-fixes)
16. [Phased Roadmap](#16-phased-roadmap)

---

## 1. Architecture Overview

```
┌──────────────────────────────────────────────────────────────┐
│                        CLIENT (Browser)                       │
│                                                               │
│  /admin/*  ──►  React (App Router, Client Components)        │
│                  ↕ tRPC (React Query)                        │
└──────────────┬───────────────────────────────────────────────┘
               │ HTTPS
┌──────────────▼───────────────────────────────────────────────┐
│                     NEXT.JS SERVER (Vercel)                   │
│                                                               │
│  middleware.ts               ──►  CSRF, security headers      │
│  app/admin/layout.tsx        ──►  Server-side auth guard      │
│  app/api/trpc/[trpc]/route   ──►  tRPC handler (Fetch adapter)│
│  server/trpc.ts              ──►  Context, session, middleware │
│  server/routers/admin.ts     ──►  All admin procedures        │
│                                                               │
└──────────┬──────────────┬────────────────────────────────────┘
           │              │
    ┌──────▼──────┐  ┌───▼────────┐  ┌──────────────┐
    │  PostgreSQL  │  │   Redis    │  │   Resend     │
    │  (Neon)      │  │  (Upstash) │  │  (Email API) │
    │  via pg Pool │  │  HTTP-based│  │  batch.send  │
    └─────────────┘  └────────────┘  └──────────────┘
```

### Dual API Design

| Layer | Routes | Auth Model | Used By |
|-------|--------|------------|---------|
| **REST** | `/api/send-otp`, `/api/verify-otp`, `/api/register` | OTP → session cookie | Public registration form |
| **tRPC** | `/api/trpc/*` | Session cookie (`session_token`) | Admin panel, team management |

These are intentionally separate — REST handles the public registration flow (no pre-existing session), while tRPC handles all authenticated admin/team operations.

---

## 2. Implementation Status

### What Exists Today

| Component | File(s) | Status |
|-----------|---------|--------|
| Admin auth library (RBAC + permissions) | `lib/auth-admin.ts` | ✅ Complete |
| Admin auth helper | `lib/auth.ts` | ✅ Complete |
| Admin tRPC router | `server/routers/admin.ts` | ✅ Complete (713 lines) |
| Team tRPC router | `server/routers/team.ts` | ✅ Complete |
| Auth tRPC router | `server/routers/auth.ts` | ✅ Complete |
| tRPC context + middleware | `server/trpc.ts` | ✅ Complete |
| Admin layout (server-side auth guard) | `app/admin/layout.tsx` | ✅ Complete |
| Admin dashboard page | `app/admin/page.tsx` | ✅ Shell (needs charts library) |
| Admin teams page | `app/admin/teams/page.tsx` | ✅ Shell (needs Shadcn components) |
| Admin sidebar + header | `components/admin/AdminSidebar.tsx`, `AdminHeader.tsx` | ✅ Complete |
| Dashboard widget components | `components/admin/dashboard/*.tsx` | ✅ Shells |
| Teams table + filters | `components/admin/teams/*.tsx` | ✅ Shells |
| Prisma schema | `prisma/schema.prisma` | ✅ Complete |
| CSRF middleware + security headers | `middleware.ts` | ✅ Complete |
| Rate limiting (sliding window) | `lib/rate-limit.ts` | ✅ Complete |
| Email service (Resend + retry + logging) | `lib/email.ts` | ✅ Complete |

### What Is Missing

| Component | Priority | Blocked By |
|-----------|----------|------------|
| **Admin login page** (`app/admin/login/page.tsx`) | **P0 — BLOCKER** | No `password` field on User model |
| **Password hashing** (bcryptjs) | **P0 — BLOCKER** | Not installed |
| Team detail page (`app/admin/teams/[id]/page.tsx`) | P1 | — |
| Email campaign router (`server/routers/admin-email.ts`) | P2 | — |
| Charts library (recharts) | P1 | Not installed |
| Shadcn UI components (table, dialog, badge, etc.) | P1 | Not installed |
| Session cleanup (cron) | P2 | — |
| Qualification rounds | P3 | — |

---

## 3. Authentication & Authorization

### 3.1 Role-Based Access Control (RBAC)

```typescript
// Defined in: prisma/schema.prisma
enum UserRole {
  PARTICIPANT   // Can only view own team
  ORGANIZER     // View all teams, add comments, send emails
  JUDGE         // View all teams, score teams
  ADMIN         // Full access except user management
  SUPER_ADMIN   // Full access including user management
}
```

### 3.2 Permission Matrix

Implemented in `lib/auth-admin.ts` → `PERMISSIONS` constant:

| Permission | PARTICIPANT | ORGANIZER | JUDGE | ADMIN | SUPER_ADMIN |
|------------|:-----------:|:---------:|:-----:|:-----:|:-----------:|
| View own team | ✅ | ✅ | ✅ | ✅ | ✅ |
| View all teams | — | ✅ | ✅ | ✅ | ✅ |
| Approve/Reject teams | — | — | — | ✅ | ✅ |
| Send emails | — | ✅ | — | ✅ | ✅ |
| Add comments | — | ✅ | ✅ | ✅ | ✅ |
| Score teams | — | — | ✅ | ✅ | ✅ |
| Export data | — | ✅ | ✅ | ✅ | ✅ |
| View audit logs | — | — | — | ✅ | ✅ |
| Manage users/roles | — | — | — | — | ✅ |

### 3.3 Authentication Flow

```
Admin visits /admin
    │
    ▼
app/admin/layout.tsx (Server Component)
    │── checkAdminAuth() reads `session_token` HttpOnly cookie
    │── Validates session in DB (not expired, role ≥ ORGANIZER)
    │
    ├─ No session ──► redirect("/admin/login")     ← NEEDS BUILDING
    ├─ Wrong role  ──► redirect("/")
    └─ Valid       ──► Render AdminSidebar + AdminHeader + {children}
```

**Current cookie strategy:** Both the public flow and admin panel share the same `session_token` cookie. The `lib/auth-admin.ts` file references an `admin_session` cookie — **this is a bug** (see Known Issues).

### 3.4 tRPC Auth Middleware

```
server/trpc.ts
    │
    ├─ publicProcedure     → No auth required
    ├─ protectedProcedure  → isAuthed middleware (any logged-in user)
    └─ adminProcedure      → isAdmin middleware (ORGANIZER | ADMIN | SUPER_ADMIN)
```

Both middlewares read `session_token` from the cookie header and validate against the `sessions` table.

---

## 4. Database Design

### 4.1 Canonical Schema

**File:** `prisma/schema.prisma` (518 lines)

> ⚠️ `prisma/schema-complete.prisma` is a stale duplicate that diverges on key constraints (see Known Issues #1). Only `schema.prisma` should be used.

Core models relevant to admin:

| Model | Purpose | Key Fields |
|-------|---------|------------|
| `User` | All users (participants + admins) | `email`, `role`, `emailVerified`, soft delete |
| `Session` | HttpOnly cookie sessions | `token` (unique), `expiresAt`, `userId` |
| `Team` | Registration entries | `track`, `status`, `createdBy`, `reviewedBy`, scoring |
| `TeamMember` | User↔Team mapping | `userId` (globally unique — one team per user) |
| `Submission` | Idea/project data | 1:1 with Team, track-specific fields |
| `Comment` | Admin notes on teams | `isInternal` flag (private vs public) |
| `TeamTag` | Custom labels | `tag` + `color`, unique per team |
| `ActivityLog` | Audit trail | `action`, `entity`, `entityId`, `metadata` (JSON) |
| `Notification` | In-app notifications | `type`, `read`, linked to User |
| `EmailLog` | Per-email delivery tracking | `status`, `messageId`, `type` |
| `EmailCampaign` | Bulk email campaigns | `filters` (JSON), send stats |
| `IdempotencyKey` | Prevent double registration | 24h TTL, stores response |

### 4.2 Indexes

The schema has comprehensive indexes:

```
teams:         (track, status), (status, createdAt), (college), (rank), (createdBy)
team_members:  (teamId)
users:         (email), (college), (role)
sessions:      (token), (userId), (expiresAt)
activity_logs: (userId), (action), (entityId), (createdAt)
email_logs:    (to), (status), (type), (createdAt), (messageId)
```

### 4.3 Missing Schema Elements

| What | Why |
|------|-----|
| `User.password` field (`String?`) | Required for admin login — participants use OTP only |
| `EmailCampaign ↔ EmailLog` relation | Can't track which campaign an individual email belongs to |
| `QualificationRound` model | Needed for Phase 4 (rounds management) |

---

## 5. API Layer (tRPC)

### 5.1 Router Structure

```
server/routers/_app.ts (App Router)
    ├── admin   → server/routers/admin.ts    (adminProcedure — 713 lines)
    ├── team    → server/routers/team.ts     (protectedProcedure — 271 lines)
    └── auth    → server/routers/auth.ts     (protectedProcedure — 181 lines)
```

### 5.2 Admin Router Procedures

| Procedure | Type | Input | Description |
|-----------|------|-------|-------------|
| `getStats` | query | — | Dashboard stats (10 parallel counts + avg review time) |
| `getTeams` | query | filters, sort, pagination | Teams list with members, submission, tags |
| `getTeamById` | query | `{ id }` | Full team detail with comments |
| `updateTeamStatus` | mutation | `{ teamId, status, notes }` | Single approve/reject + notifications |
| `bulkUpdateStatus` | mutation | `{ teamIds[], status }` | Bulk status change (⚠ no notifications) |
| `deleteTeam` | mutation | `{ teamId }` | Soft delete |
| `addComment` | mutation | `{ teamId, content, isInternal }` | Add admin comment |
| `addTag` / `removeTag` | mutation | tag data | Tag management |
| `getAnalytics` | query | — | 30-day trends, college/track/size distributions |
| `getUsers` | query | search, role, pagination | User management |
| `updateUserRole` | mutation | `{ userId, role }` | Role change (escalation protection) |
| `getActivityLogs` | query | action, userId, pagination | Audit log viewer |
| `exportTeams` | mutation | status, track, format | Data export |

### 5.3 Team Router Procedures (Participant-Facing)

| Procedure | Type | Description |
|-----------|------|-------------|
| `getMyTeams` | query | Teams where user is a member |
| `getById` | query | Team detail (member-only access) |
| `updateSubmission` | mutation | Edit submission (only DRAFT/PENDING) |
| `submitForReview` | mutation | DRAFT → PENDING with notifications |
| `withdraw` | mutation | Leader-only, before final decision |

### 5.4 Auth Router Procedures

| Procedure | Type | Description |
|-----------|------|-------------|
| `me` | query | Current user |
| `updateProfile` | mutation | Profile fields + activity log |
| `logout` | mutation | Delete session |
| `getNotifications` | query | With unread filter |
| `markNotificationRead` / `markAllRead` | mutation | Notification status |

---

## 6. Admin Dashboard

**Page:** `app/admin/page.tsx` (client component)

### 6.1 Stats Cards

Powered by `admin.getStats` — displays:
- Total teams, Pending, Approved, Rejected
- Waitlisted, Under Review
- New today, New this week
- Approval rate, Rejection rate, Avg review time (hours)

### 6.2 Charts

Powered by `admin.getAnalytics`:

| Chart | Data Source | Type |
|-------|------------|------|
| Registration Timeline | 30-day daily counts (raw SQL) | Line |
| Track Distribution | `groupBy track + status` | Pie |
| Top Colleges | `groupBy college` (top 10) | Bar |
| Team Size Distribution | `groupBy size` | Bar |

> ⚠️ **Dependency:** `recharts` is **not installed**. Dashboard chart components are placeholder shells.

---

## 7. Teams Management

**Page:** `app/admin/teams/page.tsx`

### 7.1 Filters

```typescript
interface TeamFilters {
  status: string;         // "all" | RegistrationStatus
  track: string;          // "all" | Track
  college: string;        // free text (contains, case-insensitive)
  search: string;         // team name, member name, member email
  dateRange: { from?: Date; to?: Date };
  sortBy: "createdAt" | "name" | "status" | "college";
  sortOrder: "asc" | "desc";
  page: number;
  pageSize: number;       // default 50
}
```

### 7.2 Table Columns

Team name, Track, Status, Leader (name + email + college), Member count, Created date, Tags, Comment count, Actions (View / Approve / Reject).

### 7.3 Bulk Actions

Select multiple teams → Approve / Reject / Export. Uses `bulkUpdateStatus` mutation.

### 7.4 Export

CSV generation in the browser from `exportTeams` mutation data. Activity logged server-side.

### 7.5 Team Detail (NOT YET BUILT)

**Planned:** `app/admin/teams/[id]/page.tsx`

Sections: Team info, Members, Submission details, Review actions, Comments, Activity timeline, Email history.

---

## 8. Approval / Rejection Workflow

### Single Team

```
Admin action (updateTeamStatus)
    │
    ├─ Update team.status, reviewedBy, reviewedAt, reviewNotes
    ├─ Create ActivityLog entry
    └─ Create Notification for every team member
```

### Bulk

```
Admin action (bulkUpdateStatus)
    │
    ├─ updateMany on teams
    └─ createMany ActivityLog entries
    ⚠ NO notifications sent (see Known Issues #4)
```

### Status State Machine

```
DRAFT → PENDING → UNDER_REVIEW → APPROVED
                                → REJECTED
                                → WAITLISTED
Any non-final → WITHDRAWN (leader only)
```

---

## 9. Email Campaign System

### 9.1 Current State

**Transactional emails** (OTP, confirmation, member notification) are fully implemented in `lib/email.ts`:
- Resend API with retry + exponential backoff
- Batch sending via `Resend.batch.send()` (post-response via `after()`)
- Per-email logging to `EmailLog` table
- HTML templates with XSS escaping

**Campaign emails** (bulk announcements, targeted sends) are **not yet implemented**. The `EmailCampaign` model exists in the schema but no tRPC router or UI exists.

### 9.2 Planned Campaign Flow

```
Create campaign (name, subject, body, recipient filters)
    ↓
Preview + test email to admin's address
    ↓
Schedule or send immediately
    ↓
Batch send via Resend (100/batch) using after()
    ↓
Track delivery: EmailLog per recipient, aggregate stats on EmailCampaign
```

### 9.3 Required Work

1. `server/routers/admin-email.ts` — CRUD + send procedures
2. `app/admin/email/page.tsx` — Campaign builder UI
3. Add `campaignId` optional FK to `EmailLog` model for end-to-end tracking
4. Template variable interpolation (`{{teamName}}`, `{{leaderName}}`)

---

## 10. Reports & Export

### 10.1 Available Now

- **Teams export** to CSV (via `exportTeams` mutation — client-side CSV generation)
- **Analytics data** (registration trends, college breakdown, track comparison, team size distribution)

### 10.2 Planned Reports

| Report | Data Source | Format |
|--------|------------|--------|
| Registration Summary | getStats + getAnalytics | Dashboard / CSV |
| Approval Pipeline | teams by status + review times | Chart + CSV |
| College Leaderboard | groupBy college | Table / CSV |
| Email Delivery | EmailLog aggregates | Table / CSV |
| Audit Trail | ActivityLog | Searchable table / CSV |

---

## 11. Search & Filtering

### Current Implementation

Server-side search in `getTeams` searches across:
- Team name (`contains`, case-insensitive)
- College (`contains`, case-insensitive)
- Member name (`contains`, case-insensitive, via nested relation)
- Member email (`contains`, case-insensitive, via nested relation)

### Industry-Standard Recommendations

1. **Add `pg_trgm` extension** on Neon for fuzzy/trigram-based search
2. **Debounced client-side search** (300ms) to reduce query load
3. **Saved filter presets** (localStorage or DB-persisted)
4. **Cursor-based pagination** for stable ordering on large datasets

---

## 12. Security

### 12.1 What's Implemented

| Control | Implementation |
|---------|---------------|
| CSRF protection | Origin validation in `middleware.ts` for POST/PUT/PATCH/DELETE |
| Security headers | `X-Content-Type-Options`, `X-Frame-Options`, `X-XSS-Protection`, `Referrer-Policy`, `Permissions-Policy` |
| HSTS | Production only, 2-year max-age with preload |
| CSP | Restrictive policy (self + Cloudinary for img-src) |
| Rate limiting | Sliding window counter (Redis prod / in-memory dev) on public routes |
| Input validation | Zod schemas on all tRPC procedures + REST routes |
| SQL injection prevention | Prisma ORM (parameterized queries) |
| Session management | HttpOnly cookie, DB-backed sessions with expiry |
| Soft delete | `deletedAt` field — data recoverable |
| Audit logging | `ActivityLog` on all admin mutations |
| XSS in emails | `escapeHtml()` on all template interpolation |
| Idempotency | DB-backed keys on registration (24h TTL) |
| Privilege escalation | Only SUPER_ADMIN can grant ADMIN+ roles; can't change own role |
| Duplicate email check | Global uniqueness — one email per team across entire platform |

### 12.2 What's Missing

| Gap | Risk | Fix |
|-----|------|-----|
| No password field on User model | **Admin panel completely inaccessible** | Add `password String?`, install `bcryptjs` |
| No rate limiting on tRPC routes | Compromised session could spam mutations | Add per-user sliding-window middleware |
| CSP `connect-src 'self'` too restrictive | May silently block external API calls | Add trusted external origins |
| No session cleanup | Expired sessions accumulate forever | Vercel Cron or scheduled DB cleanup |
| OTP comparison timing | SHA-256 compare without `timingSafeEqual` | Use `crypto.timingSafeEqual()` |
| No request correlation IDs | Impossible to trace a request across services | Add `X-Request-Id` in middleware |

### 12.3 Recommended Password Policy (for Admin Login)

```
Minimum 12 characters
At least 1 uppercase, 1 lowercase, 1 digit, 1 special character
bcryptjs with cost factor 12
Account lockout after 5 failed attempts (15-minute cooldown via Redis)
```

---

## 13. Performance

### 13.1 Database

- **Indexes:** Comprehensive (see section 4.2)
- **Connection pooling:** `pg` Pool via Neon — recommend adding `max: 10, idleTimeoutMillis: 30000`
- **Pagination:** Offset-based (current) — adequate for < 10K teams; add cursor-based option for scale
- **Select optimization:** `getTeams` already selects specific user fields via nested `select`
- **Batch operations:** `createMany` used for activity logs and notifications in bulk operations

### 13.2 Frontend

- **React Query:** tRPC + React Query handles caching, dedup, background refetch automatically
- **Code splitting:** Next.js App Router provides automatic route-based code splitting
- **Optimistic updates:** Not yet implemented — recommended for approve/reject to improve perceived speed

### 13.3 Caching Strategy

| Data | Strategy | TTL |
|------|----------|-----|
| Dashboard stats | React Query `staleTime: 5min` or Redis cache | 5 minutes |
| College list | Static file (`lib/data/colleges.ts`) | Build-time |
| Team list | React Query `staleTime: 30s` | 30 seconds |
| Activity logs | No cache (always fresh) | — |

---

## 14. Observability

### 14.1 Current State

- `console.log` / `console.error` structured logging in all API routes
- `ActivityLog` database table for full audit trail
- Vercel deployment logs (stdout/stderr)

### 14.2 Recommended Additions

| Tool | Purpose | Priority |
|------|---------|----------|
| **Sentry** (`@sentry/nextjs`) | Error tracking + performance | P1 |
| **Vercel Analytics** | Web vitals, function duration | P2 |
| **Structured logging** (pino) | JSON logs with correlation ID | P2 |
| **Uptime monitoring** (BetterStack) | Endpoint health checks | P3 |

### 14.3 Key Metrics

| Category | Metrics |
|----------|---------|
| Business | Registrations/day, approval rate, avg review time |
| Performance | tRPC p95 latency, DB query time, Vercel function duration |
| Reliability | Error rate, email delivery rate, session failures |
| Security | Failed login rate, rate limit hits, CSRF blocks |

---

## 15. Known Issues & Required Fixes

### Fix #1 — Two Diverging Prisma Schemas (P0)

**Problem:** `prisma/schema.prisma` and `prisma/schema-complete.prisma` diverge:
- `schema.prisma`: `TeamMember.userId @unique` (one team globally) — **correct**
- `schema-complete.prisma`: `@@unique([userId, teamId])` (allows multi-team) — **wrong**
- `schema-complete.prisma` has `@@fulltext`, `previewFeatures`, `directUrl` missing from canonical
- `schema.prisma` has no `datasource url` line

**Fix:** Delete `schema-complete.prisma`. Merge `directUrl` into `schema.prisma`.

---

### Fix #2 — Cookie Name Mismatch (P0)

**Problem:** `lib/auth-admin.ts` reads `admin_session` cookie. Everything else reads `session_token` cookie.

**Fix:** Update `getAdminSession()` to read `session_token`.

---

### Fix #3 — `updateTeamStatus` Race Condition (P1)

**Problem:** Activity log records `previousStatus` from the already-updated team object.

**Fix:** Read current status **before** the update:
```typescript
const existing = await ctx.prisma.team.findUnique({ where: { id }, select: { status: true } });
// ... update ...
metadata: { status: input.status, previousStatus: existing.status }
```

---

### Fix #4 — `bulkUpdateStatus` Missing Notifications (P1)

**Problem:** Single `updateTeamStatus` creates notifications. Bulk version doesn't.

**Fix:** After `updateMany`, fetch affected teams with members and `createMany` notifications.

---

### Fix #5 — No Admin Login Flow (P0 BLOCKER)

**Problem:** Admin layout redirects to `/login?redirect=/admin` but no login page, no password field, no hashing utility exists.

**Fix:**
1. Add `password String?` to User model + migrate
2. Install `bcryptjs`
3. Create `app/admin/login/page.tsx`
4. Create login API route
5. Create `scripts/create-admin.ts` seed script

---

### Fix #6 — CSP Blocks External Origins (P2)

**Problem:** `connect-src 'self'` may block browser-originated calls to Upstash or other services.

**Fix:** Add trusted origins to `connect-src` in middleware.

---

### Fix #7 — Hardcoded API Key in Old Docs (P0 SECURITY)

**Problem:** The previous implementation guide contained a hardcoded `RESEND_API_KEY`.

**Fix:** Removed in this document revision. Rotate the key if it was ever pushed to a public repo.

---

## 16. Phased Roadmap

### Phase 0 — Critical Fixes (1–2 days)

- [ ] Delete `prisma/schema-complete.prisma`
- [ ] Add `password String?` to User model in `schema.prisma`
- [ ] Add `datasource url = env("DATABASE_URL")` if missing
- [ ] Fix cookie name in `lib/auth-admin.ts` → `session_token`
- [ ] Fix `updateTeamStatus` to capture previous status before update
- [ ] Add notifications to `bulkUpdateStatus`
- [ ] Install `bcryptjs` + `@types/bcryptjs`

### Phase 1 — Admin Login + Dashboard (1 week)

- [ ] Create `app/admin/login/page.tsx` (email + password form)
- [ ] Create login API route (validate password, create session, set cookie)
- [ ] Create `scripts/create-admin.ts` seed script
- [ ] Install `recharts` — wire up dashboard chart components
- [ ] Install Shadcn components: table, dialog, badge, dropdown-menu, tabs, card

### Phase 2 — Team Detail + Email Campaigns (1 week)

- [ ] Create `app/admin/teams/[id]/page.tsx` (full detail view)
- [ ] Create `server/routers/admin-email.ts` (campaign CRUD + send)
- [ ] Add `campaignId` FK to `EmailLog` model
- [ ] Build `app/admin/email/page.tsx` (campaign builder UI)

### Phase 3 — Hardening (1 week)

- [ ] Rate limit admin tRPC routes
- [ ] Add `X-Request-Id` correlation header in middleware
- [ ] Session cleanup via Vercel Cron / scheduled route
- [ ] Fix CSP `connect-src`
- [ ] Add `max: 10, idleTimeoutMillis: 30000` to pg Pool
- [ ] Cursor-based pagination option for teams

### Phase 4 — Advanced Features (2 weeks)

- [ ] QualificationRound model + admin UI
- [ ] Reports page with CSV/PDF export
- [ ] Saved filter presets
- [ ] User management UI (SUPER_ADMIN only)
- [ ] Sentry integration

### Phase 5 — Testing & Polish (1 week)

- [ ] Unit tests for admin router (Vitest)
- [ ] E2E tests: login → approve flow (Playwright)
- [ ] Responsive admin layout (tablet + mobile)
- [ ] React Query `staleTime` tuning + optimistic updates

---

## Appendix A — Installed Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| next | 16.1.6 | Framework |
| react / react-dom | 19.2.3 | UI |
| @trpc/* | 11.0.0 | Type-safe API |
| @prisma/client + prisma | 7.4.0 | ORM |
| @prisma/adapter-pg + pg | 7.4.0 / 8.18.0 | PostgreSQL driver |
| @upstash/redis | 1.34.3 | Rate limit store |
| resend | 4.0.1 | Email |
| zod | 3.24.1 | Validation |
| superjson | 2.2.2 | tRPC serialization |
| framer-motion | 12.34.2 | Animations |
| lucide-react | 0.574.0 | Icons |
| sonner | 2.0.7 | Toast |
| @tanstack/react-query | 5.62.11 | Data fetching |

### Needs Installing

| Package | Purpose | Phase |
|---------|---------|-------|
| `bcryptjs` + `@types/bcryptjs` | Password hashing | Phase 0 |
| `recharts` | Dashboard charts | Phase 1 |
| `@tanstack/react-table` | Data tables | Phase 1 |
| `date-fns` | Date formatting | Phase 1 |
| `@tiptap/react` + `@tiptap/starter-kit` | Email editor | Phase 2 |
| `@sentry/nextjs` | Error tracking | Phase 4 |

---

## Appendix B — Environment Variables

```env
# Required
DATABASE_URL=postgresql://...
RESEND_API_KEY=<your-key>
UPSTASH_REDIS_URL=https://...
UPSTASH_REDIS_TOKEN=<your-token>
NEXT_PUBLIC_APP_URL=https://india-next-one.vercel.app
EMAIL_FROM=hackathon@kessc.edu.in

# Optional
ADMIN_SESSION_DURATION=28800000   # 8 hours (default)
```

> **NEVER commit real API keys to documentation or source control.**

---

*End of System Design Document*
