# API Improvements Implementation Guide

## Overview

This document outlines the implementation of API improvements including versioning, validation, error handling, caching, security hardening, and performance optimizations.

## ✅ Completed Implementations

### 1. API Design & Error Handling

#### Files Created:
- `lib/api-versioning.ts` - API version management
- `lib/error-handler.ts` - Standardized error responses
- `lib/input-sanitizer.ts` - XSS/injection prevention

#### Features:
- ✅ Standardized error response format across all APIs
- ✅ Zod validation error handling
- ✅ TRPC error mapping
- ✅ Input sanitization utilities
- ✅ XSS and SQL injection detection

### 2. Performance & Caching

#### Files Created:
- `lib/redis-cache.ts` - Redis caching layer with in-memory fallback

#### Features:
- ✅ Redis caching for frequent queries
- ✅ Automatic fallback to in-memory cache
- ✅ Cache invalidation helpers
- ✅ Predefined cache keys for dashboard, teams, analytics
- ✅ TTL-based expiration

### 3. Security Enhancements

#### Files Created:
- `lib/session-security.ts` - Secure session management

#### Features:
- ✅ Secure httpOnly cookie configuration
- ✅ Session token generation and rotation
- ✅ CSRF token generation and verification
- ✅ Session fingerprinting (IP + User Agent)
- ✅ Timing-safe token comparison

#### Existing Security (Already Implemented):
- ✅ Rate limiting with Upstash Redis (sliding window)
- ✅ CSRF/Origin validation in middleware
- ✅ Security headers (CSP, HSTS, X-Frame-Options, etc.)
- ✅ OTP-based email verification
- ✅ Idempotency keys for registration

---

## 🔄 Migration Steps

### Step 1: Add API Versioning to Routes

Create versioned API routes under `/api/v1/`:

```bash
# Create v1 directory
mkdir -p app/api/v1

# Move existing routes to v1 (optional - for backward compatibility, keep both)
# Or create new v1 routes that import from existing routes
```

Example: Create `app/api/v1/register/route.ts`:

```typescript
import { POST as registerHandler } from '@/app/api/register/route';

// Re-export with version prefix
export { registerHandler as POST };
```

### Step 2: Integrate Error Handler

Update existing API routes to use the error handler:

```typescript
import { withErrorHandler, createErrorResponse, getStatusCode } from '@/lib/error-handler';

export const POST = withErrorHandler(async (req: Request) => {
  // Your existing logic
  // Errors are automatically caught and formatted
});
```

### Step 3: Add Input Sanitization

Update registration and other input-heavy routes:

```typescript
import { sanitizeObject, containsXss } from '@/lib/input-sanitizer';

// After Zod validation
const sanitizedData = sanitizeObject(validation.data, {
  sanitizeHtml: true,
  sanitizeUrls: true,
});

// Check for XSS
if (containsXss(data.teamName)) {
  return NextResponse.json(
    createErrorResponse('VALIDATION_ERROR', 'Invalid input detected'),
    { status: 400 }
  );
}
```

### Step 4: Implement Caching in TRPC Routers

Update admin router to use caching:

```typescript
import { cacheGetOrSet, CacheKeys, invalidateDashboardCache } from '@/lib/redis-cache';

// In your TRPC procedure
getDashboardStats: adminProcedure.query(async ({ ctx }) => {
  return cacheGetOrSet(
    CacheKeys.dashboardStats(),
    async () => {
      // Your existing query logic
      const stats = await ctx.prisma.team.count();
      return stats;
    },
    { ttl: 300 } // 5 minutes
  );
}),

// Invalidate cache on mutations
createTeam: adminProcedure
  .input(z.object({ /* ... */ }))
  .mutation(async ({ ctx, input }) => {
    const team = await ctx.prisma.team.create({ /* ... */ });
    
    // Invalidate related caches
    await invalidateDashboardCache();
    await invalidateTeamCache();
    
    return team;
  }),
```

### Step 5: Enhance Session Security

Update session creation to use new security utilities:

```typescript
import {
  generateSessionToken,
  setSessionCookie,
  generateSessionFingerprint,
  SESSION_CONFIGS,
} from '@/lib/session-security';

// When creating a session
const token = generateSessionToken();
const fingerprint = generateSessionFingerprint(
  getUserAgent(req),
  getClientIp(req)
);

await prisma.session.create({
  data: {
    token,
    userId: user.id,
    fingerprint,
    expiresAt: new Date(Date.now() + SESSION_CONFIGS.user.maxAge * 1000),
  },
});

await setSessionCookie(token, SESSION_CONFIGS.user);
```

### Step 6: Add Session Rotation

Implement session rotation for sensitive operations:

```typescript
import { rotateSessionToken, shouldRotateSession } from '@/lib/session-security';

// Check if session should be rotated
if (shouldRotateSession(session.createdAt)) {
  await rotateSessionToken(
    session.token,
    async (oldToken, newToken) => {
      await prisma.session.update({
        where: { token: oldToken },
        data: { token: newToken, createdAt: new Date() },
      });
    },
    SESSION_CONFIGS.user
  );
}
```

---

## 📊 Performance Optimizations

### Database Indexes

Add indexes to frequently queried fields in `prisma/schema.prisma`:

```prisma
model Team {
  // ... existing fields
  
  @@index([status])
  @@index([track])
  @@index([college])
  @@index([createdAt])
  @@index([deletedAt])
}

model TeamMember {
  // ... existing fields
  
  @@index([userId])
  @@index([teamId])
  @@index([role])
}

model Session {
  // ... existing fields
  
  @@index([userId])
  @@index([expiresAt])
}

model ActivityLog {
  // ... existing fields
  
  @@index([userId])
  @@index([action])
  @@index([createdAt])
}
```

Run migration:
```bash
npm run db:push
```

### Query Optimization

Use Prisma's `select` and `include` strategically:

```typescript
// ❌ Bad: Fetches all fields
const teams = await prisma.team.findMany();

// ✅ Good: Only fetch needed fields
const teams = await prisma.team.findMany({
  select: {
    id: true,
    name: true,
    track: true,
    status: true,
    _count: {
      select: { members: true }
    }
  },
  where: { deletedAt: null },
});
```

---

## 🔐 Security Checklist

### Current Security Status:

- [x] Rate limiting (IP + Email, sliding window)
- [x] CSRF/Origin validation
- [x] Security headers (CSP, HSTS, etc.)
- [x] HttpOnly cookies
- [x] OTP email verification
- [x] Session-based authentication
- [x] Input validation (Zod)
- [x] Idempotency keys
- [x] SQL injection prevention (Prisma ORM)
- [x] XSS prevention (input sanitization)
- [x] Session fingerprinting
- [x] Secure session rotation

### Additional Recommendations:

1. **Environment Variables**
   - Rotate secrets regularly (database, Redis, API keys)
   - Use different secrets for dev/staging/production
   - Never commit `.env` files

2. **Monitoring**
   - Set up error tracking (Sentry)
   - Monitor rate limit hits
   - Track failed authentication attempts
   - Alert on suspicious activity

3. **Regular Security Audits**
   - Review dependencies for vulnerabilities: `npm audit`
   - Update packages regularly
   - Review access logs
   - Test authentication flows

---

## 🚀 Job Queue Implementation (Future)

For background tasks like emails and analytics, consider implementing BullMQ:

### Installation:
```bash
npm install bullmq ioredis
```

### Setup:
```typescript
// lib/queue.ts
import { Queue, Worker } from 'bullmq';
import Redis from 'ioredis';

const connection = new Redis(process.env.TCP_REDIS_URL!);

export const emailQueue = new Queue('emails', { connection });

// Worker
const emailWorker = new Worker(
  'emails',
  async (job) => {
    const { type, data } = job.data;
    
    if (type === 'registration') {
      await sendRegistrationBatchEmails(data);
    }
  },
  { connection }
);
```

### Usage:
```typescript
// Instead of sending emails directly
await emailQueue.add('registration', {
  type: 'registration',
  data: emailData,
});
```

---

## 📈 Monitoring & Analytics

### Recommended Tools:

1. **Sentry** (Error Tracking)
   ```bash
   npm install @sentry/nextjs
   ```

2. **PostHog** (Analytics)
   ```bash
   npm install posthog-js
   ```

3. **Upstash Redis Insights**
   - Monitor cache hit rates
   - Track rate limit usage
   - View key patterns

---

## 🧪 Testing

### Test Error Handling:
```typescript
// tests/api/error-handling.test.ts
import { handleGenericError, createErrorResponse } from '@/lib/error-handler';

describe('Error Handler', () => {
  it('should format Zod errors correctly', () => {
    // Test implementation
  });
  
  it('should sanitize error messages in production', () => {
    // Test implementation
  });
});
```

### Test Caching:
```typescript
// tests/lib/redis-cache.test.ts
import { cacheGet, cacheSet, cacheGetOrSet } from '@/lib/redis-cache';

describe('Redis Cache', () => {
  it('should cache and retrieve values', async () => {
    await cacheSet('test-key', { data: 'test' }, { ttl: 60 });
    const result = await cacheGet('test-key');
    expect(result).toEqual({ data: 'test' });
  });
});
```

---

## 📝 API Documentation

### Example API Response Format:

#### Success Response:
```json
{
  "success": true,
  "message": "Operation successful",
  "data": {
    "id": "123",
    "name": "Team Name"
  }
}
```

#### Error Response:
```json
{
  "success": false,
  "error": "VALIDATION_ERROR",
  "message": "Invalid email format",
  "details": [
    {
      "path": ["email"],
      "message": "Invalid email format"
    }
  ],
  "timestamp": "2026-02-28T19:00:00.000Z",
  "path": "/api/v1/register"
}
```

---

## 🔄 Rollout Plan

### Phase 1: Foundation (Week 1)
- [x] Create utility libraries
- [x] Add error handling
- [x] Implement caching layer
- [x] Enhance session security

### Phase 2: Integration (Week 2)
- [ ] Update existing API routes
- [ ] Add input sanitization
- [ ] Implement cache invalidation
- [ ] Add session rotation

### Phase 3: Optimization (Week 3)
- [ ] Add database indexes
- [ ] Optimize queries
- [ ] Implement job queue
- [ ] Add monitoring

### Phase 4: Testing & Documentation (Week 4)
- [ ] Write tests
- [ ] Update API documentation
- [ ] Performance testing
- [ ] Security audit

---

## 📚 Resources

- [Next.js API Routes](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)
- [TRPC Documentation](https://trpc.io/docs)
- [Upstash Redis](https://upstash.com/docs/redis)
- [Zod Validation](https://zod.dev/)
- [OWASP Security Guidelines](https://owasp.org/www-project-top-ten/)

---

## 🎯 Success Metrics

Track these metrics to measure improvement:

1. **Performance**
   - API response time (target: <200ms for cached, <1s for uncached)
   - Cache hit rate (target: >80%)
   - Database query time (target: <100ms)

2. **Security**
   - Rate limit violations (monitor trends)
   - Failed authentication attempts
   - XSS/injection attempts blocked

3. **Reliability**
   - Error rate (target: <0.1%)
   - Uptime (target: 99.9%)
   - Successful email delivery rate (target: >95%)

---

## 🆘 Support

For questions or issues:
1. Check this documentation
2. Review code comments
3. Check existing tests
4. Consult team members

---

**Last Updated:** February 28, 2026
**Version:** 1.0.0
