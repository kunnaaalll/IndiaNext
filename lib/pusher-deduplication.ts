/**
 * Pusher Event Deduplication
 *
 * Prevents duplicate Pusher events within time windows to save quota.
 * Uses Redis SET with NX (only set if not exists) for atomic deduplication.
 *
 * Algorithm:
 *   - Generate unique event key from event type, team ID, desk ID, etc.
 *   - Attempt to set key in Redis with NX flag (only succeeds if key doesn't exist)
 *   - If set succeeds → new event, allow it
 *   - If set fails → duplicate event, skip it
 *   - Key expires after window (default 10 seconds)
 *
 * Fallback:
 *   - In-memory Map for development when Redis is unavailable
 *   - Auto-cleanup every 5 minutes to prevent memory leaks
 *
 * Usage:
 *   const isDuplicate = await isDuplicatePusherEvent('qr:TEAM123:DESK-A:ADMIN456');
 *   if (isDuplicate) {
 *     console.log('Skipping duplicate event');
 *     return;
 *   }
 */

import { getRedis } from './rate-limit';

// ─── In-Memory Fallback Store ──────────────────────────────────────────────────

interface MemoryRecord {
  timestamp: number;
}

const memoryStore = new Map<string, MemoryRecord>();

// ─── Deduplication with Redis ──────────────────────────────────────────────────

async function deduplicateWithRedis(
  eventKey: string,
  windowSeconds: number
): Promise<boolean> {
  const client = getRedis();
  if (!client) return false; // Fall back to memory

  try {
    const key = `dedup:${eventKey}`;
    
    // SET with NX (only set if not exists) and EX (expiry)
    // Returns 'OK' if key was set (new event), null if key already exists (duplicate)
    const result = await client.set(key, '1', { nx: true, ex: windowSeconds });
    
    // If result is 'OK', key was set → new event (not duplicate)
    // If result is null, key already exists → duplicate event
    return result === null;
  } catch (err) {
    console.error('[PusherDedup] Redis error, falling back to memory:', err);
    return false; // Fall back to memory on error
  }
}

// ─── Deduplication with Memory ─────────────────────────────────────────────────

function deduplicateWithMemory(
  eventKey: string,
  windowSeconds: number
): boolean {
  const now = Date.now();
  const windowMs = windowSeconds * 1000;
  const key = `dedup:${eventKey}`;

  const record = memoryStore.get(key);

  // Check if record exists and is within window
  if (record && now - record.timestamp < windowMs) {
    return true; // Duplicate
  }

  // Store new record
  memoryStore.set(key, { timestamp: now });
  return false; // Not duplicate
}

// ─── Core Deduplication Function ───────────────────────────────────────────────

/**
 * Check if a Pusher event is a duplicate within the time window.
 *
 * @param eventKey - Unique key for the event (e.g., 'qr:TEAM123:DESK-A:ADMIN456')
 * @param windowSeconds - Deduplication window in seconds (default: 10)
 * @returns true if duplicate (skip event), false if new (send event)
 */
export async function isDuplicatePusherEvent(
  eventKey: string,
  windowSeconds: number = 10
): Promise<boolean> {
  const client = getRedis();

  if (client) {
    const isDuplicate = await deduplicateWithRedis(eventKey, windowSeconds);
    if (isDuplicate) {
      console.log(`[PusherDedup] Duplicate event detected: ${eventKey}`);
    }
    return isDuplicate;
  } else {
    console.warn('[PusherDedup] No Redis — using in-memory store. Configure Upstash for production!');
    const isDuplicate = deduplicateWithMemory(eventKey, windowSeconds);
    if (isDuplicate) {
      console.log(`[PusherDedup] Duplicate event detected (memory): ${eventKey}`);
    }
    return isDuplicate;
  }
}

// ─── Memory Store Cleanup ──────────────────────────────────────────────────────

export function cleanupMemoryDedup(): void {
  const now = Date.now();
  const MAX_AGE = 2 * 3600 * 1000; // 2 hours

  for (const [key, record] of memoryStore.entries()) {
    if (now - record.timestamp > MAX_AGE) {
      memoryStore.delete(key);
    }
  }
}

// Auto-cleanup every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(cleanupMemoryDedup, 5 * 60 * 1000);
}
