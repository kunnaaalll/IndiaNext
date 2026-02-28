# IndiaNext — Registration Flow, Security Analysis & Industry Recommendations

> **Scope:** Traces every API call, database write, ID generation, and email event in the registration lifecycle. Maps current implementation against industry standards and recommends actionable fixes.
>
> **Last updated:** 2026-02-19 · **Branch:** `backend/sanchit`

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Complete Registration Lifecycle](#2-complete-registration-lifecycle)
3. [Phase 1 — Form Initialization (Client)](#3-phase-1--form-initialization-client)
4. [Phase 2 — OTP Request](#4-phase-2--otp-request)
5. [Phase 3 — OTP Verification & Session Creation](#5-phase-3--otp-verification--session-creation)
6. [Phase 4 — Registration Submission](#6-phase-4--registration-submission)
7. [Phase 5 — Post-Registration (Current vs Expected)](#7-phase-5--post-registration-current-vs-expected)
8. [ID Generation & Storage Map](#8-id-generation--storage-map)
9. [Security Audit — Current State](#9-security-audit--current-state)
10. [Critical Fixes (Must Do)](#10-critical-fixes-must-do)
11. [Industry Best Practices Gap Analysis](#11-industry-best-practices-gap-analysis)
12. [Email Strategy — Industry Standard](#12-email-strategy--industry-standard)
13. [Recommended Implementation Roadmap](#13-recommended-implementation-roadmap)

---

## 1. Architecture Overview

```
┌──────────────────────────────────────────────────────────────────────┐
│                         CLIENT (Browser)                             │
│  app/components/HackathonForm.tsx (1015 lines)                       │
│  - React state machine (useState for step, answers, OTP)             │
│  - Generates idempotencyKey via crypto.randomUUID() on mount         │
│  - Session stored in HttpOnly cookie (set by server)                 │
└──────────────┬───────────────┬──────────────────┬────────────────────┘
               │               │                  │
         POST /api/       POST /api/         POST /api/
         send-otp         verify-otp         register
               │               │                  │
┌──────────────▼───────────────▼──────────────────▼────────────────────┐
│                      SERVER (Next.js App Router)                     │
│  Rate Limiting: lib/rate-limit.ts (Redis + in-memory fallback)       │
│  Validation:    Zod schemas per endpoint                             │
│  Email:         lib/email.ts (Resend)                                │
│  Database:      lib/prisma.ts (Prisma 7 + pg adapter → Neon)         │
└──────────────────────────────────────────────────────────────────────┘
               │
┌──────────────▼──────────────────────────────────────────────────────┐
│                      DATABASE (Neon PostgreSQL)                      │
│  Tables: users, otps, sessions, teams, team_members,                │
│          submissions, activity_logs, files, comments, ...            │
│  13 models, 8 enums, 30+ indexes                                    │
└─────────────────────────────────────────────────────────────────────┘
```

**Key design decisions:**

- REST endpoints handle the public registration flow (no prior session needed)
- tRPC endpoints (`/api/trpc/*`) handle authenticated admin panel operations
- OTP-based authentication — no passwords
- Session tokens are opaque hex strings (32 bytes), stored in `sessions` table

---

## 2. Complete Registration Lifecycle

```
USER OPENS /register
        │
        ▼
┌─ PHASE 1: FORM INIT ─────────────────────────────────────────────┐
│  • idempotencyKey = crypto.randomUUID()          [CLIENT MEMORY]  │
│  • User fills track, team name, leader details    [CLIENT STATE]  │
│  • No server calls. Nothing in database yet.                      │
└───────────────────────────────────┬───────────────────────────────┘
                                    │ User reaches leaderEmail step
                                    ▼
┌─ PHASE 2: OTP REQUEST ───────────────────────────────────────────┐
│  POST /api/send-otp                                               │
│  • Rate limit check (IP: 10/min, Email: 3/min)                   │
│  • Generate 6-digit OTP                                           │
│  • SHA-256 hash → store in DB                    [DB: otps]       │
│  • Send OTP email via Resend                     [EMAIL SENT #1]  │
│  ID created: Otp.id (cuid)                                        │
└───────────────────────────────────┬───────────────────────────────┘
                                    │ User enters 6-digit code
                                    ▼
┌─ PHASE 3: OTP VERIFY + SESSION ──────────────────────────────────┐
│  POST /api/verify-otp                                             │
│  • Rate limit check (IP: 20/min)                                  │
│  • Hash input, compare with stored hash                           │
│  • On match: Otp.verified = true                 [DB: otps]       │
│  • Find or create User record                    [DB: users]      │
│  • Create Session (32-byte hex token, 30d)       [DB: sessions]   │
│  IDs created: User.id (cuid), Session.id (cuid)                   │
│  Token created: Session.token (64-char hex)                       │
│  • Server sets HttpOnly cookie                   [COOKIE]         │
└───────────────────────────────────┬───────────────────────────────┘
                                    │ User completes remaining fields
                                    │ and clicks submit
                                    ▼
┌─ PHASE 4: REGISTRATION (Atomic Transaction) ─────────────────────┐
│  POST /api/register                                               │
│  • Rate limit (IP: 5/hr)                                          │
│  • Zod validation                                                 │
│  • Idempotency check (DB: idempotency_keys)      [DB]             │
│  • Session token validation (from HttpOnly cookie)[DB: sessions]   │
│  • OTP verified check                            [DB: otps]       │
│  • BEGIN $transaction:                                            │
│    ① Duplicate check (leader + track)            [DB: teams]      │
│    ② Create/update User for each member          [DB: users]      │
│    ③ Create Team record                          [DB: teams]      │
│    ④ Create TeamMember for each                  [DB: team_mems]  │
│    ⑤ Create Submission                           [DB: submissions]│
│    ⑥ Create ActivityLog                          [DB: act_logs]   │
│  • COMMIT                                                         │
│  IDs created: Team.id, TeamMember.id(s), Submission.id,           │
│               ActivityLog.id (all cuid)                           │
│  • Store idempotency response                    [DB]             │
└───────────────────────────────────┬───────────────────────────────┘
                                    │
                                    ▼
┌─ PHASE 5: POST-REGISTRATION ─────────────────────────────────────┐
│  • Client shows ThankYouScreen                                    │
│  ✅ Confirmation email to leader (team ID, members, track)        │
│  ✅ Notification email to each team member                        │
│  ❌ No magic link for document upload (Phase 2)                   │
└───────────────────────────────────────────────────────────────────┘
```

---

## 3. Phase 1 — Form Initialization (Client)

**File:** `app/components/HackathonForm.tsx`

### What happens on mount

```
Component renders → useState initializations:
  • started = false               (show welcome screen)
  • currentStep = 0               (first question)
  • answers = {}                  (empty answers map)
  • idempotencyKey = crypto.randomUUID()   ← GENERATED ONCE per form session
  • emailVerified = false
  • showOtpInput = false
```

### Idempotency key generation (Line ~648)

```typescript
const [idempotencyKey] = useState(() => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();   // e.g. "550e8400-e29b-41d4-a716-446655440000"
  }
  return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
});
```

**What this means:** The UUID is generated client-side when the form component mounts. It stays constant for the entire form session. If the user refreshes the page, a NEW key is generated — the old one provides no protection.

**Industry practice:** Idempotency keys should be generated before the first submission attempt and persisted in `sessionStorage` so page refreshes don't lose them. Better yet, enforce idempotency server-side in the database (unique constraint), not in ephemeral memory.

### Question routing

The form has 32 total `QUESTIONS[]` entries. Questions are conditionally shown based on:

- **Track selection** — IdeaSprint vs BuildStorm questions
- **Team size** — Member 2/3/4 fields appear dynamically
- **College checkbox** — "Same as Leader" hides college text input

Navigation uses `getNextValidStep()` which skips questions where `condition()` returns false.

~~**Problem:** The step counter shows `STEP X / 32` where 32 is `QUESTIONS.length`.~~ **✅ Fixed:** The step counter now uses `visibleStepIndex / visibleSteps` computed via `useMemo`, showing only questions whose conditions are met (e.g. "STEP 5 / 18" for a solo IdeaSprint participant).

---

## 4. Phase 2 — OTP Request

**Client trigger:** User fills `leaderEmail` and clicks "CONFIRM DATA >>"

**File:** `app/api/send-otp/route.ts` (144 lines)

### Request flow

```
Client                                          Server
──────                                          ──────
POST /api/send-otp
{
  email: "user@example.com",         ──────►   1. Zod validation:
  purpose: "REGISTRATION",                        SendOtpSchema.safeParse(body)
  track: "IDEA_SPRINT"                             ✓ email: valid email format
}                                                  ✓ purpose: enum match
                                                   ✓ track: optional enum

                                               2. Rate limiting:
                                                  rateLimitCombined(req, email, 10, 3, 60)
                                                  ├─ IP check:  10 requests / 60 seconds
                                                  └─ Email check: 3 requests / 60 seconds
                                                  Uses Redis (Upstash) if configured,
                                                  falls back to in-memory Map

                                               3. Generate OTP:
                                                  otp = crypto.randomInt(100000, 999999)
                                                  → 6-digit number, e.g. "482917"

                                               4. Hash:
                                                  otpHash = SHA-256(otp)
                                                  → 64-char hex string

                                               5. Database write:
                                                  prisma.otp.upsert({
                                                    where: { email_purpose: {
                                                      email, purpose: 'REGISTRATION'
                                                    }},
                                                    create: { email, otp: otpHash,
                                                      purpose: 'REGISTRATION',
                                                      expiresAt: now + 10min,
                                                      verified: false, attempts: 0 },
                                                    update: { otp: otpHash,
                                                      expiresAt: now + 10min,
                                                      verified: false, attempts: 0 }
                                                  })

                                                  → ID generated: Otp.id (cuid)
                                                  → Unique key: [email, purpose]
                                                  → Overwrites any previous OTP for
                                                    this email+purpose combo

                                               6. Send email:
                                                  sendOtpEmail(email, otp, track)
                                                  → Resend API call
                                                  → HTML template with track-specific
                                                    branding (green for IdeaSprint,
                                                    blue for BuildStorm)
                                                  → Subject: "Your Verification Code -
                                                    IndiaNext (Idea Sprint Track)"

                                               7. Response:
{ success: true,                     ◄──────     { success: true,
  message: "OTP sent successfully",                message: "OTP sent successfully",
  expiresIn: 600 }                                 expiresIn: 600 }
                                                  + X-RateLimit-* headers
```

### Database state after this phase

| Table | Record | Key Fields |
|-------|--------|------------|
| `otps` | 1 new/updated | `id`: cuid, `email`: user's email, `otp`: SHA-256 hash, `purpose`: REGISTRATION, `expiresAt`: T+10min, `verified`: false, `attempts`: 0 |

### ~~Security issue — OTP logged in plaintext~~ ✅ FIXED

```typescript
// Line 88 — Current code (FIXED)
console.log(`[OTP] Generated for ${email}: hash=${otpHash.substring(0, 8)}... (${purpose})`);
// ✅ Only the hash prefix is logged — raw OTP never reaches stdout.
```

**OWASP reference:** A09:2021 — Security Logging and Monitoring Failures. ~~Never log authentication secrets.~~ ✅ Resolved: only hash prefix + purpose are logged.

---

## 5. Phase 3 — OTP Verification & Session Creation

**Client trigger:** User enters 6-digit OTP and clicks "AUTHENTICATE"

**File:** `app/api/verify-otp/route.ts` (258 lines)

### Request flow

```
Client                                          Server
──────                                          ──────
POST /api/verify-otp
{
  email: "user@example.com",         ──────►   1. Rate limit: rateLimitByIP(req, 20, 60)
  otp: "482917",                                  20 attempts / 60 seconds / IP
  purpose: "REGISTRATION"
}
                                               2. Zod validation:
                                                  ✓ email: valid format
                                                  ✓ otp: exactly 6 digits
                                                  ✓ purpose: enum match

                                               3. Hash input:
                                                  otpHash = SHA-256("482917")

                                               4. Database read:
                                                  prisma.otp.findUnique({
                                                    where: { email_purpose:
                                                      { email, purpose } }
                                                  })

                                               5. Validation checks:
                                                  ├─ Record exists?     → 400 if not
                                                  ├─ Expired?           → 400 + delete record
                                                  └─ Hash matches?     → see below

                                               6a. MISMATCH:
                                                   attempts++ (in DB)
                                                   If attempts >= 5:
                                                     → delete OTP record (lockout)
                                                     → 429 TOO_MANY_ATTEMPTS
                                                   Else:
                                                     → 400 INVALID_OTP
                                                     → attemptsRemaining: 5 - n

                                               6b. MATCH:
                                                   prisma.otp.update({
                                                     verified: true,
                                                     verifiedAt: new Date()
                                                   })

                                               7. Find or create User:
                                                  user = prisma.user.findUnique(email)
                                                  if (!user):
                                                    prisma.user.create({
                                                      email, name: '',
                                                      emailVerified: true,
                                                      role: 'PARTICIPANT'
                                                    })
                                                    → User.id generated (cuid)
                                                  else:
                                                    prisma.user.update({
                                                      emailVerified: true
                                                    })

                                               8. Create session:
                                                  token = crypto.randomBytes(32).hex()
                                                  → 64-character hex string
                                                  prisma.session.create({
                                                    userId: user.id,
                                                    token,
                                                    expiresAt: now + 30 days,
                                                    ipAddress, userAgent
                                                  })
                                                  → Session.id generated (cuid)

                                               9. Response:
{ success: true,                     ◄──────     {
  data: {                                          success: true,
    user: { id, email, name, role }, ◄──────       data: {
  }                                                  user: { id, email, name, role },
}                                                  }
+ Set-Cookie: session_token=<64-hex>;              }
  HttpOnly; Secure; SameSite=Strict; ◄──────     ✅ Token in HttpOnly cookie,
  Path=/; Expires=<30d>                             NOT in response body
```

### Client-side storage (HackathonForm.tsx) — ✅ FIXED

```typescript
// Only the user email is stored in localStorage (for display/UX).
// Session token is managed entirely via HttpOnly cookie.
localStorage.setItem('user_email', response.data.user.email);
// ✅ No session_token or session_expires in localStorage
```

### Database state after this phase

| Table | Record | Key Fields |
|-------|--------|------------|
| `otps` | Updated | `verified`: true, `verifiedAt`: timestamp |
| `users` | 1 new or updated | `id`: cuid, `email`: verified, `name`: '' (empty until registration), `emailVerified`: true, `role`: PARTICIPANT |
| `sessions` | 1 new | `id`: cuid, `token`: 64-char hex, `userId`: → users.id, `expiresAt`: T+30 days |

### Security issues in this phase — ✅ ALL FIXED

| Issue | Severity | Status | Detail |
|-------|----------|--------|--------|
| **Session in localStorage** | ~~CRITICAL~~ | ✅ **Fixed** | Session token now set as `HttpOnly` + `Secure` + `SameSite=Strict` cookie — never exposed to client JS |
| **OTP record lingers** | ~~HIGH~~ | ✅ **Fixed** | OTP record deleted inside `$transaction` during registration (Step ⑥). Register endpoint also validates session token from cookie + checks email match. |
| **User.name is empty** | LOW | Acceptable | Created as `''` — updated during registration. This is by design. |

**Industry practice:** ✅ Session is now an `HttpOnly` cookie. ✅ OTP record is deleted after successful registration.

---

## 6. Phase 4 — Registration Submission

**Client trigger:** User completes all form fields and clicks "CONFIRM DATA >>"

**File:** `app/api/register/route.ts` (523 lines)

### Pre-transaction checks

```
Client                                          Server
──────                                          ──────
POST /api/register
Headers:
  Content-Type: application/json
  Cookie: session_token=<64-hex>      ← ✅ Sent automatically by browser

Body:
{
  idempotencyKey: "550e8400-...",     ──────►  1. Rate limit:
  track: "IdeaSprint: Build...",                  rateLimitByIP(req, 5, 3600)
  teamName: "Innovation Squad",                   5 registrations / 1 hour / IP
  teamSize: "3 Members",
  leaderName: "...",                           2. Zod validation:
  leaderEmail: "...",                             RegisterSchema.safeParse(body)
  leaderMobile: "...",                            ✓ 23 fields validated
  leaderCollege: "...",                           ✓ track: 4 valid values
  leaderDegree: "...",                            ✓ idempotencyKey: UUID format
  member2Name: "...",                             ✓ emails, phone, URLs checked
  member2Email: "...",
  ...track-specific fields...                  3. Idempotency check:
}                                                 await checkIdempotency(key)
                                                  → DB: prisma.idempotencyKey.findUnique
                                                  → Returns cached response if exists
                                                  → ✅ Persists across cold starts

                                               4. Session validation:
                                                  token = cookies().get('session_token')
                                                  session = prisma.session.findUnique({ token })
                                                  → 401 if no token or session expired
                                                  → 403 if session.user.email ≠ leaderEmail
                                                  → ✅ Validates session + email match

                                               5. OTP verification check:
                                                  prisma.otp.findUnique({
                                                    where: { email_purpose:
                                                      { email: leaderEmail,
                                                        purpose: 'REGISTRATION' }}
                                                  })
                                                  → Must have verified: true
                                                  → 403 if not verified

                                               5. Track mapping:
                                                  "IdeaSprint: Build MVP..." → IDEA_SPRINT
                                                  "BuildStorm: Solve..." → BUILD_STORM

                                               6. Build members array:
                                                  [
                                                    { ...leader, role: 'LEADER' },
                                                    { ...member2, role: 'MEMBER' },
                                                    { ...member3, role: 'MEMBER' },
                                                    { ...member4, role: 'MEMBER' },
                                                  ]
```

### Inside the atomic transaction

This is the critical section. Everything below runs inside `prisma.$transaction()` — if ANY step fails, ALL changes are rolled back.

```
BEGIN TRANSACTION
│
├─ STEP ①: Duplicate check
│  tx.team.findFirst({
│    where: {
│      track: IDEA_SPRINT,
│      members: { some: {
│        user: { email: leaderEmail },
│        role: 'LEADER'
│      }}
│    }
│  })
│  → If found: throw "DUPLICATE_REGISTRATION:..."
│  → Caught outside transaction → 409 Conflict
│
├─ STEP ②: Create/update User records for ALL members
│  FOR EACH member in [leader, member2, member3, member4]:
│    user = tx.user.findUnique({ where: { email } })
│    IF exists:
│      tx.user.update({
│        name, college, degree, phone  ← merge with existing
│      })
│    ELSE:
│      tx.user.create({
│        email, name, college, degree, phone,
│        emailVerified: (email === leaderEmail),  ← only leader verified
│        role: 'PARTICIPANT'
│      })
│      → User.id generated: cuid (e.g. "clx7abc...")
│    Collect: userIds[] = [{ userId, role }]
│
├─ STEP ③: Create Team record
│  tx.team.create({
│    name: "Innovation Squad",
│    track: IDEA_SPRINT,
│    status: 'PENDING',            ← initial status
│    size: 3,                      ← members.length
│    college: leaderCollege,
│    hearAbout: "Instagram",
│    additionalNotes: "...",
│    createdBy: userIds[0].userId   ← leader's User.id
│  })
│  → Team.id generated: cuid (e.g. "clx7def...")
│  → ★ This is the "group ID" — the primary identifier for the team
│
├─ STEP ④: Create TeamMember link records
│  FOR EACH { userId, role } in userIds:
│    tx.teamMember.create({
│      userId,
│      teamId: team.id,
│      role: 'LEADER' or 'MEMBER'
│    })
│    → TeamMember.id generated: cuid
│    → Unique constraint: [userId, teamId]
│    → This is the many-to-many link between users and teams
│
├─ STEP ⑤: Create Submission record
│  tx.submission.create({
│    teamId: team.id,
│    // IdeaSprint fields (only if IDEA_SPRINT):
│    ideaTitle, problemStatement, proposedSolution,
│    targetUsers, expectedImpact, techStack,
│    // BuildStorm fields (only if BUILD_STORM):
│    problemDesc, githubLink
│  })
│  → Submission.id generated: cuid (e.g. "clx7ghi...")
│  → One-to-one with Team (teamId is @unique)
│
├─ STEP ⑥: Create ActivityLog record
│  tx.activityLog.create({
│    userId: leader.userId,
│    action: 'team.created',
│    entity: 'Team',
│    entityId: team.id,
│    metadata: { teamName, track, memberCount },
│    ipAddress: x-forwarded-for header,
│    userAgent: user-agent header
│  })
│  → ActivityLog.id generated: cuid
│
COMMIT TRANSACTION
```

### Post-transaction response

```
Server                                          Client
──────                                          ──────
{                                    ──────►    response.data = {
  success: true,                                  teamId: "clx7def...",
  message: "Registration successful!",            submissionId: "clx7ghi...",
  data: {                                         teamName: "Innovation Squad",
    teamId: "clx7def...",                         track: "IDEA_SPRINT"
    submissionId: "clx7ghi...",                 }
    teamName: "Innovation Squad",
    track: "IDEA_SPRINT"                        → Shows ThankYouScreen
  }                                             }
}                                               → Shows ThankYouScreen
+ X-RateLimit-* headers                         → ✅ Emails sent (fire-and-forget)
```

### Idempotency storage — ✅ DB-based

```typescript
// After successful registration, outside $transaction:
if (data.idempotencyKey) {
  await storeIdempotency(data.idempotencyKey, response);
  // → Stored in: prisma.idempotencyKey (DB table)
  // → Expires: 24 hours (enforced via expiresAt field)
  // → ✅ Persists across cold starts / Lambda instances
}
```

### Database state after this phase

| Table | Records Created | Key Fields |
|-------|----------------|------------|
| `users` | 1-4 (created or updated) | Leader: `emailVerified: true`. Members: `emailVerified: false` |
| `teams` | 1 | `id`: cuid, `status`: PENDING, `track`: enum, `createdBy`: leader's userId |
| `team_members` | 1-4 | Links userId ↔ teamId with role (LEADER/MEMBER) |
| `submissions` | 1 | Track-specific fields, linked to team via `teamId` |
| `activity_logs` | 1 | Action: 'team.created', full metadata + IP/UA |

### Error handling

| Error | HTTP Status | When |
|-------|-------------|------|
| Rate limit exceeded | 429 | > 5 registrations/hr from same IP |
| Validation failed | 400 | Zod schema mismatch |
| Email not verified | 403 | OTP record not found or `verified: false` |
| Duplicate registration | 409 | Leader already has team in this track |
| Unique constraint violation | 409 | Team member already in another team for track |
| Internal error | 500 | Unexpected database or runtime error |

---

## 7. Phase 5 — Post-Registration (Current vs Expected)

### Current behavior — ✅ Updated

After `POST /api/register` returns success:

1. Client shows `ThankYouScreen` with track name
2. ✅ **Confirmation email** sent to leader (team ID, members, track, "what's next")
3. ✅ **Notification email** sent to each team member (leader info, track, team name)
4. Team ID is included in the confirmation email for future reference
5. **IdeaSprint teams cannot yet upload required documents** (pitch deck, etc.) — Phase 2
6. Emails are fire-and-forget (`Promise.allSettled`) — registration succeeds even if email fails

### What industry-standard hackathon platforms do

Devfolio, Devpost, HackerEarth, MLH all follow this pattern:

```
Registration Submitted
        │
        ├──► [IMMEDIATE] Confirmation email to leader
        │      • Team ID / registration number
        │      • Team name, track, member list
        │      • Link to team dashboard / submission portal
        │      • Deadline information
        │      • "What's next" instructions
        │
        ├──► [IMMEDIATE] Notification email to each team member
        │      • "You've been added to team [Name]"
        │      • Leader's name
        │      • Track information
        │      • Link to verify/accept membership
        │
        ├──► [IMMEDIATE] Admin notification (optional)
        │      • New registration alert in admin dashboard
        │      • Slack/Discord webhook
        │
        ├──► [24h LATER] Reminder email if documents missing
        │      • "You haven't uploaded your pitch deck yet"
        │      • Magic link to submission portal
        │
        └──► [DEADLINE -24h] Final reminder
               • "Submission deadline is tomorrow"
               • Checklist of what's missing
```

---

## 8. ID Generation & Storage Map

Every ID in the system is a `cuid` (collision-resistant unique identifier), generated by Prisma. Example: `clx7f8k2a0001qw...`.

### Complete ID lifecycle

```
PHASE    TABLE          ID TYPE     WHEN CREATED          PURPOSE
──────   ──────         ───────     ────────────          ───────
Phase 2  otps           cuid        OTP requested         OTP tracking record
Phase 3  users          cuid        OTP verified          User identity (leader)
Phase 3  sessions       cuid        OTP verified          Session record
Phase 3  sessions.token 64-hex      OTP verified          Auth token (sent to client)
Phase 4  users          cuid        Registration          User identity (members 2-4)
Phase 4  teams          cuid        Registration (tx)     ★ THE GROUP/TEAM ID
Phase 4  team_members   cuid        Registration (tx)     User↔Team link
Phase 4  submissions    cuid        Registration (tx)     Track-specific data
Phase 4  activity_logs  cuid        Registration (tx)     Audit trail
```

### Which IDs the client receives

| Endpoint | IDs Returned | Client Storage |
|----------|-------------|----------------|
| `POST /api/verify-otp` | `user.id`, `user.email`, `user.name`, `user.role` | `user_email` in localStorage; session token in `HttpOnly` cookie (not accessible to JS) |
| `POST /api/register` | `teamId`, `submissionId`, `teamName`, `track` | ThankYouScreen display + ✅ emailed to leader |

**✅ Resolved:** The `teamId` is now included in the confirmation email sent to the leader, so it is no longer lost if the user closes the tab.

---

## 9. Security Audit — Current State

### What's working well

| Feature | Implementation | Rating |
|---------|---------------|--------|
| OTP hashing | SHA-256 before DB storage | ✅ Good |
| Rate limiting | Combined IP + email, Redis + fallback | ✅ Good |
| Input validation | Zod schemas on all 3 endpoints | ✅ Good |
| SQL injection prevention | Prisma parameterized queries | ✅ Good |
| Transaction safety | Atomic `$transaction` with duplicate check inside | ✅ Good |
| Attempt lockout | 5 failed OTP attempts → record deleted | ✅ Good |
| Activity logging | IP, user agent, action, metadata captured | ✅ Good |
| Soft deletes | `deletedAt` field on users and teams | ✅ Good |

### Critical vulnerabilities — ✅ ALL RESOLVED

#### ~~VULN-1: OTP plaintext in production logs~~ ✅ FIXED

**Severity:** ~~CRITICAL~~ Resolved
**File:** `app/api/send-otp/route.ts`, Line 88

```typescript
// Current code — only logs hash prefix:
console.log(`[OTP] Generated for ${email}: hash=${otpHash.substring(0, 8)}... (${purpose})`);
```

✅ The raw OTP is no longer logged. Only the hash prefix is written to stdout.

---

#### ~~VULN-2: Session token in localStorage (XSS-vulnerable)~~ ✅ FIXED

**Severity:** ~~CRITICAL~~ Resolved
**File:** `app/api/verify-otp/route.ts`

✅ Session token is now set as an `HttpOnly` + `Secure` + `SameSite=Strict` cookie by the server. The client only stores `user_email` in localStorage (for display). No session secrets are accessible to client-side JavaScript.

---

#### ~~VULN-3: Registration endpoint doesn't validate session~~ ✅ FIXED

**Severity:** ~~HIGH~~ Resolved
**File:** `app/api/register/route.ts`

✅ The endpoint now reads the session token from the `HttpOnly` cookie, validates it against the `sessions` table, checks expiry, and verifies that `session.user.email === data.leaderEmail`. This prevents User B from registering using User A's verified OTP.

---

#### ~~VULN-4: In-memory idempotency is useless in serverless~~ ✅ FIXED

**Severity:** ~~HIGH~~ Resolved
**File:** `app/api/register/route.ts`, `prisma/schema.prisma`

✅ Idempotency is now DB-backed via the `IdempotencyKey` model (`key @unique`, `response Json`, `expiresAt DateTime`). Additionally, `@@unique([createdBy, track])` on the Team model provides belt-and-suspenders duplicate protection at the database level.

---

#### ~~VULN-5: Demo bypass not environment-gated~~ ✅ FIXED

**Severity:** ~~HIGH~~ Resolved
**File:** `app/components/HackathonForm.tsx`

✅ The demo bypass (`demo@indianext.in`) has been removed entirely from the codebase. No hardcoded email bypass exists in any environment.

---

### Medium vulnerabilities — Partially resolved

| # | Issue | Severity | Status | Detail |
|---|-------|----------|--------|--------|
| VULN-6 | ~~No CSRF protection~~ | ~~MEDIUM~~ | ✅ **Fixed** | `middleware.ts` validates Origin/Referer for POST/PUT/PATCH/DELETE in production |
| VULN-7 | No input sanitization beyond Zod | MEDIUM | ⚠️ Open | Zod validates format, not content — XSS possible in admin dashboard if rendering user input as HTML |
| VULN-8 | ~~`sendOtp` stale closure~~ | ~~LOW~~ | ✅ **Fixed** | `answers.track` added to dependency array |

---

## 10. Critical Fixes (Must Do) — ✅ ALL IMPLEMENTED

### Fix 1: Move session to HttpOnly cookie — ✅ Done

**Files:** `verify-otp/route.ts`, `register/route.ts`, `HackathonForm.tsx`

```typescript
// verify-otp/route.ts — Set cookie instead of returning token in body
const res = NextResponse.json({
  success: true,
  message: 'OTP verified successfully',
  data: {
    user: { id: user.id, email: user.email, name: user.name, role: user.role },
  },
});

res.cookies.set('session_token', session.token, {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  maxAge: 30 * 24 * 60 * 60, // 30 days
  path: '/',
});

return res;
```

Remove all `localStorage.setItem('session_token', ...)` from client. Remove `Authorization` header from fetch — the cookie is sent automatically by the browser.

✅ **Implemented.** Session token set as HttpOnly cookie. Client only stores `user_email`.

---

### Fix 2: Validate session in registration endpoint — ✅ Done

```typescript
// register/route.ts — After rate limit, before Zod validation
const token = req.cookies?.get('session_token')?.value
  || req.headers.get('cookie')?.match(/session_token=([^;]+)/)?.[1];

if (!token) {
  return NextResponse.json(
    { success: false, error: 'AUTH_REQUIRED' },
    { status: 401 }
  );
}

const session = await prisma.session.findUnique({
  where: { token },
  include: { user: true },
});

if (!session || session.expiresAt < new Date()) {
  return NextResponse.json(
    { success: false, error: 'SESSION_EXPIRED' },
    { status: 401 }
  );
}

// After Zod validation, verify email matches session:
if (session.user.email !== data.leaderEmail) {
  return NextResponse.json(
    { success: false, error: 'EMAIL_MISMATCH' },
    { status: 403 }
  );
}
```

✅ **Implemented.** Session validated from cookie, email match enforced, 401/403 on mismatch.

---

### Fix 3: Remove OTP from logs — ✅ Done

```typescript
// send-otp/route.ts Line 88 — Current code:
console.log(
  `[OTP] Sent to ${email.replace(/(.{3}).*@/, '$1***@')} (hash: ${otpHash.substring(0, 8)}...)`
);
```

✅ **Implemented.** Only hash prefix is logged. Raw OTP never reaches stdout.

---

### Fix 4: Delete OTP after successful registration — ✅ Done

```typescript
// Inside the $transaction in register/route.ts, after creating ActivityLog:
await tx.otp.deleteMany({
  where: { email: data.leaderEmail, purpose: 'REGISTRATION' },
});
```

This prevents the OTP `verified: true` from being reused and cleans up the database.

✅ **Implemented.** OTP deleted inside `$transaction` Step ⑥ of register/route.ts.

---

### Fix 5: Environment-gate the demo bypass — ✅ Done (Removed entirely)

```typescript
// HackathonForm.tsx — All 3 demo check locations
if (process.env.NODE_ENV === 'development' && answers.leaderEmail === "demo@indianext.in") {
```

`process.env.NODE_ENV` works in client components because Next.js inlines it at build time.

✅ **Implemented.** The demo bypass was removed entirely (not just environment-gated). No `demo@indianext.in` bypass exists in any file.

---

### Fix 6: Replace in-memory idempotency with database constraint — ✅ Done

Remove the `Map`-based idempotency cache entirely. The `$transaction` duplicate check is the real protection. Add a database unique constraint for belt-and-suspenders safety:

```prisma
model Team {
  // ... existing fields
  @@unique([createdBy, track])  // One team per leader per track
}
```

✅ **Implemented.** `IdempotencyKey` DB model added. `@@unique([createdBy, track])` added to Team model. In-memory Map removed.
```

---

## 11. Industry Best Practices Gap Analysis

| Practice | Industry Standard | Current State | Gap |
|----------|-------------------|---------------|-----|
| **Session storage** | HttpOnly + Secure + SameSite cookie | ✅ HttpOnly cookie | ✅ **Done** |
| **Token rotation** | Rotate session token on privilege escalation | Never rotated | ⚠️ Medium |
| **OTP expiry cleanup** | Cron job or DB TTL to purge expired OTPs | Never cleaned | ⚠️ Low (DB bloat) |
| **Confirmation email** | Immediate transactional email on registration | ✅ `sendConfirmationEmail()` | ✅ **Done** |
| **Member notification** | Email each added member | ✅ `sendTeamMemberNotification()` | ✅ **Done** |
| **Idempotency** | Server-side (Redis/DB), not in-memory | ✅ DB: `IdempotencyKey` model | ✅ **Done** |
| **CSRF protection** | Origin header validation or CSRF tokens | ✅ `middleware.ts` origin validation | ✅ **Done** |
| **Content Security Policy** | CSP headers to prevent XSS | ✅ CSP in `middleware.ts` (production) | ✅ **Done** |
| **Rate limit response** | `Retry-After` header (RFC 7231) | ✅ Has retryAfter in body + headers | ✅ Good |
| **Structured error codes** | Machine-readable error codes + human messages | ✅ Has both | ✅ Good |
| **Request validation** | Schema validation on all inputs | ✅ Zod on all 3 endpoints | ✅ Good |
| **Atomic writes** | Database transactions for multi-table writes | ✅ `$transaction` | ✅ Good |
| **Audit trail** | Log who did what, when, from where | ✅ ActivityLog model | ✅ Good |
| **Soft deletion** | Don't hard-delete user data | ✅ `deletedAt` fields | ✅ Good |
| **Secret hashing** | Hash OTPs/passwords before storage | ✅ SHA-256 | ✅ Good |

---

## 12. Email Strategy — Industry Standard

### Transactional emails the system MUST send

| # | Email | Trigger | To | Priority | Status |
|---|-------|---------|----|----------|--------|
| 1 | **OTP Verification** | OTP requested | Leader | P0 | ✅ Implemented |
| 2 | **Registration Confirmation** | Registration successful | Leader | P0 | ✅ **Implemented** (`sendConfirmationEmail`) |
| 3 | **Team Member Notification** | Registration successful | Each member | P1 | ✅ **Implemented** (`sendTeamMemberNotification`) |
| 4 | **Document Upload Reminder** | 24h after registration (if IdeaSprint and no docs) | Leader | P2 | ❌ Not implemented (Phase 2) |
| 5 | **Status Change** | Admin approves/rejects | Leader + members | P1 | ❌ Not implemented (Phase 2) |
| 6 | **Deadline Reminder** | 24h before submission deadline | All registered | P2 | ❌ Not implemented (Phase 2) |

### Email #2: Registration Confirmation (template spec)

```
Subject: ✅ Registration Confirmed — IndiaNext Hackathon
From: IndiaNext <noreply@indianext.in>
To: {leaderEmail}

Content:
  ┌──────────────────────────────────────┐
  │  INDIANEXT HACKATHON 2025            │
  │  Registration Confirmation           │
  ├──────────────────────────────────────┤
  │                                      │
  │  Team: {teamName}                    │
  │  Track: {track}                      │
  │  Team ID: {teamId}                   │
  │  Status: PENDING REVIEW              │
  │                                      │
  │  Team Members:                       │
  │  1. {leaderName} (Leader) ✓ Verified │
  │  2. {member2Name}                    │
  │  3. {member3Name}                    │
  │                                      │
  │  ┌──────────────────────────────┐    │
  │  │  UPLOAD DOCUMENTS            │    │  ← Magic link button
  │  │  indianext.in/submit/{token} │    │     (for IdeaSprint only)
  │  └──────────────────────────────┘    │
  │                                      │
  │  What's Next:                        │
  │  • Upload pitch deck (IdeaSprint)    │
  │  • Wait for team review              │
  │  • Check email for status updates    │
  │                                      │
  │  Deadline: {deadline}                │
  └──────────────────────────────────────┘
```

### Email #3: Team Member Notification (template spec)

```
Subject: You've been added to Team {teamName} — IndiaNext
From: IndiaNext <noreply@indianext.in>
To: {memberEmail}

Content:
  "Hi {memberName},

   {leaderName} has added you to team '{teamName}' for the
   {track} track at IndiaNext Hackathon 2025.

   If this wasn't you, please contact {leaderEmail} or
   reply to this email."
```

### Implementation — Where to add email sending

```typescript
// app/api/register/route.ts
// AFTER the $transaction succeeds, OUTSIDE the transaction:
// (Emails should not block the transaction — if email fails,
//  registration should still succeed)

const result = await prisma.$transaction(async (tx) => { ... });

// Send emails asynchronously (fire-and-forget with error logging)
Promise.allSettled([
  sendConfirmationEmail(data.leaderEmail, {
    teamId: result.team.id,
    teamName: result.team.name,
    track: trackEnum,
    members: members.map(m => ({
      name: m.name,
      email: m.email,
      role: m.role,
    })),
  }),
  ...members.slice(1).map(member =>
    sendTeamMemberNotification(member.email, {
      memberName: member.name,
      teamName: result.team.name,
      leaderName: data.leaderName,
      leaderEmail: data.leaderEmail,
      track: trackEnum,
    })
  ),
]).then(results => {
  const failed = results.filter(r => r.status === 'rejected');
  if (failed.length > 0) {
    console.error(`[Register] ${failed.length} email(s) failed to send`);
  }
});

// Return response immediately — don't wait for emails
return NextResponse.json(response);
```

**Why outside the transaction:** Industry practice is to never couple email delivery with database transactions. If Resend is slow or down, the registration should not fail. Send emails after commit, log failures, and implement a retry queue for failed emails later.

### Email deliverability best practices

| Practice | How | Current Status |
|----------|-----|----------------|
| Use a dedicated sender domain | `noreply@indianext.in` with SPF, DKIM, DMARC | ⚠️ Using `onboarding@resend.dev` fallback |
| Don't send from generic domains | Resend's default is for testing only | ⚠️ Must configure domain |
| Track delivery status | Resend webhooks → store in email logs table | ❌ Not implemented |
| Exponential retry | Queue failed emails, retry 3x with backoff | ❌ Not implemented |
| Unsubscribe link | Required by CAN-SPAM / GDPR for marketing emails | N/A for transactional |

---

## 13. Recommended Implementation Roadmap

### Week 1 — Critical Security Fixes ✅ ALL DONE

| # | Task | Effort | Status |
|---|------|--------|--------|
| 1 | Move session to HttpOnly cookie | 2h | ✅ Done |
| 2 | Validate session token in register endpoint | 1h | ✅ Done |
| 3 | Remove OTP from production logs | 15m | ✅ Done |
| 4 | Delete OTP record after registration | 15m | ✅ Done |
| 5 | Gate demo bypass with `NODE_ENV` | 15m | ✅ Done (removed entirely) |
| 6 | Remove in-memory idempotency + add DB unique constraint | 30m | ✅ Done |

### Week 2 — Emails & Document Upload (Partially Done)

| # | Task | Effort | Status |
|---|------|--------|--------|
| 7 | Add `sendConfirmationEmail()` template | 2h | ✅ Done |
| 8 | Add `sendTeamMemberNotification()` template | 1h | ✅ Done |
| 9 | Send emails after registration (fire-and-forget) | 1h | ✅ Done |
| 10 | Add `SubmissionToken` model to schema | 30m | ❌ Phase 2 |
| 11 | Create `/submit/[token]` page with file upload | 4h | ❌ Phase 2 |
| 12 | Generate magic link token after registration | 30m | ❌ Phase 2 |

### Week 3 — Hardening (✅ ALL DONE)

| # | Task | Effort | Status |
|---|------|--------|--------|
| 13 | Add CSRF origin validation middleware | 1h | ✅ Done |
| 14 | Fix step counter to show only visible questions | 30m | ✅ Done |
| 15 | Fix `sendOtp` stale closure (add `answers.track` to deps) | 5m | ✅ Done |
| 16 | Create `.env.example` with all required vars | 15m | ❌ Open |
| 17 | Remove unused schema models or move to future branch | 30m | ❌ Open |
| 18 | Configure Resend sender domain (SPF/DKIM/DMARC) | 1h | ❌ Open |

### Month 2 — Polish

| # | Task | Effort | Status |
|---|------|--------|--------|
| 19 | Email delivery tracking (Resend webhooks) | 3h | ❌ Phase 2 |
| 20 | OTP fallback portal for lost magic links | 3h | ❌ Phase 2 |
| 21 | File upload validation + virus scanning | 4h | ❌ Phase 2 |
| 22 | Content Security Policy headers | 1h | ✅ Done |
| 23 | Load testing + rate limit tuning | 2h | ❌ Phase 2 |

---

## Summary

The registration flow has a **solid technical foundation** — atomic transactions, SHA-256 OTP hashing, combined rate limiting, Zod validation, and structured error responses. These are the hard parts, and they're done well.

### Implementation Status (Updated 2026-02-19)

All critical security and UX fixes have been implemented:

| # | Fix | Status | Files Changed |
|---|-----|--------|---------------|
| 1 | Session in HttpOnly cookie (not localStorage) | ✅ **Done** | `verify-otp/route.ts` |
| 2 | Session validation in register endpoint | ✅ **Done** | `register/route.ts` |
| 3 | OTP not logged in plaintext | ✅ **Done** | `send-otp/route.ts` |
| 4 | OTP deleted after registration | ✅ **Done** | `register/route.ts` (inside $transaction) |
| 5 | Demo bypass removed | ✅ **Done** | `HackathonForm.tsx` |
| 6 | DB-based idempotency (not in-memory) | ✅ **Done** | `register/route.ts`, `schema.prisma` (IdempotencyKey model) |
| 7 | `@@unique([createdBy, track])` on Team | ✅ **Done** | `schema.prisma` |
| 8 | Confirmation email to leader | ✅ **Done** | `lib/email.ts`, `register/route.ts` |
| 9 | Member notification email(s) | ✅ **Done** | `lib/email.ts`, `register/route.ts` |
| 10 | Emails fire outside transaction | ✅ **Done** | `register/route.ts` (Promise.allSettled after commit) |
| 11 | CSRF/Origin validation middleware | ✅ **Done** | `middleware.ts` |
| 12 | Security headers (CSP, X-Frame-Options, etc.) | ✅ **Done** | `middleware.ts` |
| 13 | Fixed step counter (visible questions only) | ✅ **Done** | `HackathonForm.tsx` |
| 14 | Fixed missing `await` on checkIdempotency | ✅ **Done** | `register/route.ts` |
| 15 | **Global email uniqueness** — no duplicate emails across any team | ✅ **Done** | `register/route.ts` (Zod + pre-txn query), `schema.prisma` (`@unique` on `TeamMember.userId`), `HackathonForm.tsx` (client-side check) |

### Remaining items (Phase 2+)

| # | Task | Priority |
|---|------|----------|
| 1 | Magic link for document upload (IdeaSprint) | P1 |
| 2 | Email delivery tracking (Resend webhooks) | P2 |
| 3 | OTP expired records cron cleanup | P2 |
| 4 | File upload validation + virus scanning | P2 |
| 5 | Configure Resend sender domain (SPF/DKIM/DMARC) | P1 |
| 6 | Load testing + rate limit tuning | P2 |
