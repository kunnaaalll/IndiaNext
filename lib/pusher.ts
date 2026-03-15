import Pusher from 'pusher';
import { checkPusherQuota, trackPusherEvent } from './pusher-monitor';
import { executePusherWithCircuitBreaker } from './pusher-circuit-breaker';

// Server-side Pusher (lazy initializer)
let _pusherServer: Pusher | null = null;

export const getPusherServer = () => {
  if (!_pusherServer) {
    const appId = process.env.PUSHER_APP_ID;
    const key = process.env.NEXT_PUBLIC_PUSHER_KEY;
    const secret = process.env.PUSHER_SECRET;
    const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER;

    if (!appId || !key || !secret || !cluster) {
      console.warn('Pusher server variables are missing. Triggering events will fail.', {
        hasAppId: !!appId,
        hasKey: !!key,
        hasSecret: !!secret,
        hasCluster: !!cluster,
      });
      return null;
    }

    console.log(`[Pusher] Initializing server for App ID: ${appId.substring(0, 4)}...`);

    _pusherServer = new Pusher({
      appId,
      key,
      secret,
      cluster,
      useTLS: true,
    });
  }
  return _pusherServer;
};

// Browser-side Pusher Client
let pusherClient: any = null;

export const getPusherClient = () => {
  if (typeof window === 'undefined') return null;

  if (!pusherClient) {
    const key = process.env.NEXT_PUBLIC_PUSHER_KEY;
    const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER;

    if (!key || !cluster) {
      console.warn('Pusher environment variables are missing. Real-time features will not work.');
      return null;
    }

    try {
      // Synchronous require but only on client
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const PusherLib = require('pusher-js');

      console.log(`[Pusher] Initializing client for cluster: ${cluster}`);
      pusherClient = new PusherLib(key, {
        cluster: cluster,
        forceTLS: true,
        enabledTransports: ['ws', 'wss'],
      });
      console.log('[Pusher] Client instance created successfully');
    } catch (err) {
      console.error('[Pusher] Client initialization failed:', err);
      return null;
    }
  }
  return pusherClient;
};

// ─── Pusher Event Wrapper with Monitoring ──────────────────────────────────────

/**
 * Wrapper for pusher.trigger() with quota checking, circuit breaker, and event tracking.
 *
 * This function adds three security layers:
 *   1. Quota checking - Warns if approaching daily limit (200k messages)
 *   2. Circuit breaker - Gracefully degrades when Pusher fails repeatedly
 *   3. Event tracking - Records all events for monitoring and alerting
 *
 * @param channel - Pusher channel name (e.g., 'private-admin-checkin-A')
 * @param event - Event name (e.g., 'qr:scanned', 'scanner:presence')
 * @param data - Event payload
 * @returns true on success, false on failure
 */
export async function triggerPusherEvent(
  channel: string,
  event: string,
  data: any
): Promise<boolean> {
  const pusher = getPusherServer();

  if (!pusher) {
    console.warn('[Pusher] Server not initialized, skipping event trigger');
    return false;
  }

  try {
    // Step 1: Check quota before sending
    const quota = await checkPusherQuota();

    if (quota.warningLevel === 'warning') {
      console.warn(
        `[Pusher] Quota warning: ${quota.percentUsed.toFixed(1)}% used (${quota.usage}/${quota.limit})`
      );
    }

    if (quota.warningLevel === 'emergency') {
      console.error(
        `[Pusher] EMERGENCY: Quota at ${quota.percentUsed.toFixed(1)}% - event may be throttled`
      );
    }

    if (!quota.ok) {
      console.error(
        `[Pusher] Quota exceeded (${quota.usage}/${quota.limit}), skipping event: ${event}`
      );
      return false;
    }

    // Step 2: Execute with circuit breaker protection
    const result = await executePusherWithCircuitBreaker(async () => {
      await pusher.trigger(channel, event, data);
    });

    if (!result.success) {
      console.error(`[Pusher] Failed to trigger event: ${result.error}`);
      return false;
    }

    // Step 3: Track successful event
    await trackPusherEvent(event);

    return true;
  } catch (err) {
    console.error('[Pusher] Unexpected error in triggerPusherEvent:', err);
    return false;
  }
}
