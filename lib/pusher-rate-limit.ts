/**
 * Pusher Event Rate Limiting
 *
 * Prevents quota exhaustion by enforcing per-event-type rate limits.
 * Uses the existing sliding window rate limiter from lib/rate-limit.ts.
 *
 * Algorithm:
 *   - Each event type has its own limit (qr:scanned: 30/min, scanner:presence: 10/min, etc.)
 *   - Tracks both per-minute and per-hour windows to prevent burst attacks
 *   - Uses Redis keys: pusher:{eventName}:{identifier}:min and pusher:{eventName}:{identifier}:hour
 *
 * Usage:
 *   const result = await rateLimitPusherEvent('qr:scanned', adminId);
 *   if (!result.allowed) {
 *     console.warn('Rate limit exceeded:', result.reason);
 *     return; // Skip Pusher event
 *   }
 */

import { checkRateLimit } from './rate-limit';

// ─── Per-Event-Type Rate Limits ────────────────────────────────────────────────

export const PUSHER_LIMITS = {
  'qr:scanned': {
    perMinute: 30,
    perHour: 1000,
  },
  'scanner:presence': {
    perMinute: 10,
    perHour: 300,
  },
  'checkin:confirmed': {
    perMinute: 20,
    perHour: 800,
  },
  'checkin:flagged': {
    perMinute: 10,
    perHour: 400,
  },
  'stats:updated': {
    perMinute: 5,
    perHour: 200,
  },
} as const;

export type PusherEventType = keyof typeof PUSHER_LIMITS;

// ─── Rate Limit Result ─────────────────────────────────────────────────────────

export interface PusherRateLimitResult {
  allowed: boolean;
  reason?: string;
  remaining?: number;
  reset?: number;
}

// ─── Core Rate Limiting Function ───────────────────────────────────────────────

/**
 * Check if a Pusher event should be rate limited.
 *
 * @param eventName - The event type (e.g., 'qr:scanned', 'scanner:presence')
 * @param identifier - Unique identifier for the rate limit (e.g., adminId, deskId)
 * @returns Result indicating if event is allowed and rate limit details
 */
export async function rateLimitPusherEvent(
  eventName: PusherEventType,
  identifier: string
): Promise<PusherRateLimitResult> {
  const limits = PUSHER_LIMITS[eventName];

  if (!limits) {
    console.warn(`[PusherRateLimit] Unknown event type: ${eventName}`);
    return { allowed: true };
  }

  // Check per-minute limit
  const minuteKey = `pusher:${eventName}:${identifier}:min`;
  const minuteResult = await checkRateLimit(minuteKey, limits.perMinute, 60);

  if (!minuteResult.success) {
    return {
      allowed: false,
      reason: `Rate limit exceeded for ${eventName}: ${limits.perMinute} events per minute`,
      remaining: minuteResult.remaining,
      reset: minuteResult.reset,
    };
  }

  // Check per-hour limit
  const hourKey = `pusher:${eventName}:${identifier}:hour`;
  const hourResult = await checkRateLimit(hourKey, limits.perHour, 3600);

  if (!hourResult.success) {
    return {
      allowed: false,
      reason: `Rate limit exceeded for ${eventName}: ${limits.perHour} events per hour`,
      remaining: hourResult.remaining,
      reset: hourResult.reset,
    };
  }

  return {
    allowed: true,
    remaining: Math.min(minuteResult.remaining, hourResult.remaining),
    reset: Math.max(minuteResult.reset, hourResult.reset),
  };
}
