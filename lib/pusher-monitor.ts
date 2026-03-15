/**
 * Pusher Quota Monitoring and Tracking
 *
 * Tracks Pusher message usage to prevent quota exhaustion (200k messages/day).
 * Uses Redis hash to store daily metrics with automatic expiry.
 *
 * Features:
 *   - Track total events and per-event-type counts
 *   - Daily metrics with automatic 7-day retention
 *   - Quota checking with 80% warning and 90% emergency thresholds
 *   - Metrics endpoint for admin monitoring
 *
 * Redis Structure:
 *   Key: pusher:metrics:YYYY-MM-DD
 *   Hash fields:
 *     - total: total event count
 *     - event:qr:scanned: count for qr:scanned events
 *     - event:scanner:presence: count for scanner:presence events
 *     - etc.
 *
 * Usage:
 *   await trackPusherEvent('qr:scanned');
 *   const quota = await checkPusherQuota();
 *   if (!quota.ok) console.warn('Quota exceeded!');
 */

import { getRedis } from './rate-limit';

// ─── Constants ─────────────────────────────────────────────────────────────────

const DAILY_QUOTA_LIMIT = 200_000; // 200k messages per day
const WARNING_THRESHOLD = 0.8; // 80% of quota
const EMERGENCY_THRESHOLD = 0.9; // 90% of quota
const METRICS_RETENTION_DAYS = 7;

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface PusherMetrics {
  date: string;
  totalEvents: number;
  eventsByType: Record<string, number>;
  lastReset: string;
}

export interface PusherQuotaStatus {
  ok: boolean;
  usage: number;
  remaining: number;
  limit: number;
  percentUsed: number;
  warningLevel: 'normal' | 'warning' | 'emergency';
}

// ─── Helper Functions ──────────────────────────────────────────────────────────

function getTodayKey(): string {
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  return `pusher:metrics:${today}`;
}

function getEventFieldName(eventName: string): string {
  return `event:${eventName}`;
}

// ─── Track Pusher Event ────────────────────────────────────────────────────────

/**
 * Track a Pusher event in daily metrics.
 * Increments both total count and per-event-type count.
 *
 * @param eventName - The event type (e.g., 'qr:scanned', 'scanner:presence')
 */
export async function trackPusherEvent(eventName: string): Promise<void> {
  const client = getRedis();
  if (!client) {
    console.warn('[PusherMonitor] No Redis — metrics tracking disabled');
    return;
  }

  try {
    const key = getTodayKey();
    const eventField = getEventFieldName(eventName);

    // Increment both total and per-event counters atomically
    const pipe = client.pipeline();
    pipe.hincrby(key, 'total', 1);
    pipe.hincrby(key, eventField, 1);
    pipe.expire(key, METRICS_RETENTION_DAYS * 24 * 60 * 60); // 7 days retention

    await pipe.exec();
  } catch (err) {
    console.error('[PusherMonitor] Failed to track event:', err);
  }
}

// ─── Get Pusher Metrics ────────────────────────────────────────────────────────

/**
 * Retrieve daily Pusher metrics from Redis.
 *
 * @returns Metrics object with total events and breakdown by event type
 */
export async function getPusherMetrics(): Promise<PusherMetrics> {
  const client = getRedis();
  const today = new Date().toISOString().split('T')[0];

  if (!client) {
    console.warn('[PusherMonitor] No Redis — returning empty metrics');
    return {
      date: today,
      totalEvents: 0,
      eventsByType: {},
      lastReset: new Date().toISOString(),
    };
  }

  try {
    const key = getTodayKey();
    const data = await client.hgetall(key);

    if (!data || typeof data !== 'object') {
      return {
        date: today,
        totalEvents: 0,
        eventsByType: {},
        lastReset: new Date().toISOString(),
      };
    }

    const totalEvents = Number(data.total) || 0;
    const eventsByType: Record<string, number> = {};

    // Extract per-event counts
    for (const [field, value] of Object.entries(data)) {
      if (field.startsWith('event:')) {
        const eventName = field.substring(6); // Remove 'event:' prefix
        eventsByType[eventName] = Number(value) || 0;
      }
    }

    return {
      date: today,
      totalEvents,
      eventsByType,
      lastReset: new Date().toISOString(),
    };
  } catch (err) {
    console.error('[PusherMonitor] Failed to get metrics:', err);
    return {
      date: today,
      totalEvents: 0,
      eventsByType: {},
      lastReset: new Date().toISOString(),
    };
  }
}

// ─── Check Pusher Quota ────────────────────────────────────────────────────────

/**
 * Check current Pusher quota usage against daily limit.
 * Returns status with warning levels for proactive monitoring.
 *
 * @returns Quota status with usage, remaining, and warning level
 */
export async function checkPusherQuota(): Promise<PusherQuotaStatus> {
  const metrics = await getPusherMetrics();
  const usage = metrics.totalEvents;
  const remaining = Math.max(0, DAILY_QUOTA_LIMIT - usage);
  const percentUsed = (usage / DAILY_QUOTA_LIMIT) * 100;

  let warningLevel: 'normal' | 'warning' | 'emergency' = 'normal';
  let ok = true;

  if (usage >= DAILY_QUOTA_LIMIT * EMERGENCY_THRESHOLD) {
    warningLevel = 'emergency';
    ok = false;
    console.error(
      `[PusherMonitor] EMERGENCY: Pusher quota at ${percentUsed.toFixed(1)}% (${usage}/${DAILY_QUOTA_LIMIT})`
    );
  } else if (usage >= DAILY_QUOTA_LIMIT * WARNING_THRESHOLD) {
    warningLevel = 'warning';
    console.warn(
      `[PusherMonitor] WARNING: Pusher quota at ${percentUsed.toFixed(1)}% (${usage}/${DAILY_QUOTA_LIMIT})`
    );
  }

  return {
    ok,
    usage,
    remaining,
    limit: DAILY_QUOTA_LIMIT,
    percentUsed,
    warningLevel,
  };
}
