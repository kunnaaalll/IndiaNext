import { NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/auth';
import { getPusherServer } from '@/lib/pusher';
import { handleGenericError } from '@/lib/error-handler';
import { z } from 'zod';

/**
 * POST /api/pusher/auth
 *
 * Authenticate Pusher private channel subscriptions.
 * Validates admin session and enforces desk/role-based access control.
 *
 * Requirements: 2.8, 2.9, 2.10, 2.11
 */

const authSchema = z.object({
  socket_id: z.string(),
  channel_name: z.string(),
});

export async function POST(req: Request) {
  try {
    // 1. Validate admin session
    const session = await getAdminSession();
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized', message: 'Admin session required' },
        { status: 403 }
      );
    }

    const admin = session.admin;

    // 2. Parse request body
    const body = await req.json();
    const parsed = authSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid request', details: parsed.error.errors },
        { status: 400 }
      );
    }

    const { socket_id, channel_name } = parsed.data;

    // 3. Validate channel access

    // Check for private-admin-checkin-* channels (desk-specific)
    const deskChannelMatch = channel_name.match(/^private-admin-checkin-(.+)$/);
    if (deskChannelMatch) {
      const deskId = deskChannelMatch[1];

      // If admin has an assigned desk, enforce desk restriction
      if (admin.desk && admin.desk !== deskId) {
        return NextResponse.json(
          {
            success: false,
            error: 'Forbidden',
            message: `Access denied: You are assigned to desk ${admin.desk} and cannot access desk ${deskId}`,
          },
          { status: 403 }
        );
      }

      // Admin without assigned desk can access any desk (ADMIN/SUPER_ADMIN typically)
    }

    // Check for private-admin-updates channel (global updates)
    else if (channel_name === 'private-admin-updates') {
      // Only ADMIN and SUPER_ADMIN can access global updates
      if (admin.role !== 'ADMIN' && admin.role !== 'SUPER_ADMIN') {
        return NextResponse.json(
          {
            success: false,
            error: 'Forbidden',
            message: 'Access denied: ADMIN or SUPER_ADMIN role required for global updates channel',
          },
          { status: 403 }
        );
      }
    }

    // Unknown private channel
    else {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid channel',
          message: `Unknown channel: ${channel_name}`,
        },
        { status: 400 }
      );
    }

    // 4. Authorize channel with Pusher
    const pusher = getPusherServer();
    if (!pusher) {
      return NextResponse.json(
        { success: false, error: 'Service unavailable', message: 'Pusher not configured' },
        { status: 503 }
      );
    }

    const authResponse = pusher.authorizeChannel(socket_id, channel_name);

    // 5. Return auth response
    return NextResponse.json(authResponse);
  } catch (error) {
    return handleGenericError(error, '/api/pusher/auth');
  }
}
