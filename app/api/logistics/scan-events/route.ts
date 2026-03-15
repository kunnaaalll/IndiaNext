/**
 * /api/logistics/scan-events — Server-Sent Events endpoint
 *
 * The logistics dashboard on the laptop connects here on load.
 * Whenever lookupTeamByCode fires (mobile or laptop scan), the tRPC router
 * emits to scanEmitter → this route pushes the JSON team data to all SSE
 * clients. Zero external services. Zero quota.
 *
 * Usage (client):
 *   const es = new EventSource('/api/logistics/scan-events');
 *   es.onmessage = (e) => { const team = JSON.parse(e.data); ... };
 */

import { type NextRequest } from 'next/server';
import { scanEmitter, type ScanEvent } from '@/lib/scan-emitter';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export const runtime = 'nodejs'; // SSE requires Node.js runtime (not Edge)
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  // ── Auth guard: only logged-in admins can subscribe ──────────────────────
  const session = await getServerSession(authOptions);
  if (!session) {
    return new Response('Unauthorized', { status: 401 });
  }

  // ── Set up the SSE stream ─────────────────────────────────────────────────
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      // Send an initial heartbeat so the client knows the connection is alive
      controller.enqueue(encoder.encode(': connected\n\n'));

      // Forward every scan event to this SSE client
      const onScan = (event: ScanEvent) => {
        try {
          const data = JSON.stringify(event);
          controller.enqueue(encoder.encode(`data: ${data}\n\n`));
        } catch {
          // Client disconnected mid-write — will be cleaned up below
        }
      };

      scanEmitter.on('scan', onScan);

      // Keep-alive ping every 25s to prevent proxy timeouts
      const ping = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: ping\n\n`));
        } catch {
          clearInterval(ping);
        }
      }, 25_000);

      // Cleanup when client disconnects
      req.signal.addEventListener('abort', () => {
        scanEmitter.off('scan', onScan);
        clearInterval(ping);
        try { controller.close(); } catch { /* already closed */ }
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no', // Disable Nginx buffering for SSE
    },
  });
}
