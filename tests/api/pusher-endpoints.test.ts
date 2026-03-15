/**
 * Integration Tests for Pusher API Endpoints
 *
 * Tests for:
 * - /api/pusher/auth (Pusher channel authentication)
 * - /api/admin/pusher-metrics (Pusher usage metrics)
 *
 * Requirements: 2.8, 2.9, 2.10, 2.11, 2.19
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextResponse } from 'next/server';

// Mock dependencies
vi.mock('@/lib/auth', () => ({
  getAdminSession: vi.fn(),
}));

vi.mock('@/lib/pusher', () => ({
  getPusherServer: vi.fn(),
}));

vi.mock('@/lib/pusher-monitor', () => ({
  getPusherMetrics: vi.fn(),
  checkPusherQuota: vi.fn(),
}));

vi.mock('@/lib/error-handler', () => ({
  handleGenericError: vi.fn((error) =>
    NextResponse.json({ success: false, error: 'Internal error' }, { status: 500 })
  ),
}));

import { POST as pusherAuthPost } from '@/app/api/pusher/auth/route';
import { GET as pusherMetricsGet } from '@/app/api/admin/pusher-metrics/route';
import { getAdminSession } from '@/lib/auth';
import { getPusherServer } from '@/lib/pusher';
import { getPusherMetrics, checkPusherQuota } from '@/lib/pusher-monitor';

describe('Pusher API Endpoints', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /api/pusher/auth', () => {
    it('should return 403 when no admin session exists', async () => {
      (getAdminSession as any).mockResolvedValue(null);

      const req = new Request('http://localhost/api/pusher/auth', {
        method: 'POST',
        body: JSON.stringify({ socket_id: 'test-socket', channel_name: 'private-admin-checkin-A' }),
      });

      const response = await pusherAuthPost(req);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 403 when admin tries to access wrong desk', async () => {
      (getAdminSession as any).mockResolvedValue({
        admin: { id: '1', role: 'LOGISTICS', deskId: 'desk-B' },
      });
      (getPusherServer as any).mockReturnValue({
        authorizeChannel: vi.fn().mockReturnValue({ auth: 'test-auth' }),
      });

      const req = new Request('http://localhost/api/pusher/auth', {
        method: 'POST',
        body: JSON.stringify({ socket_id: 'test-socket', channel_name: 'private-admin-checkin-A' }),
      });

      const response = await pusherAuthPost(req);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.success).toBe(false);
      expect(data.message).toContain('desk');
    });

    it('should authorize admin without desk restriction', async () => {
      (getAdminSession as any).mockResolvedValue({
        admin: { id: '1', role: 'ADMIN', deskId: null },
      });
      (getPusherServer as any).mockReturnValue({
        authorizeChannel: vi.fn().mockReturnValue({ auth: 'test-auth-token' }),
      });

      const req = new Request('http://localhost/api/pusher/auth', {
        method: 'POST',
        body: JSON.stringify({ socket_id: 'test-socket', channel_name: 'private-admin-checkin-A' }),
      });

      const response = await pusherAuthPost(req);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.auth).toBe('test-auth-token');
    });
  });

  describe('GET /api/admin/pusher-metrics', () => {
    it('should return 401 when no admin session exists', async () => {
      (getAdminSession as any).mockResolvedValue(null);

      const req = new Request('http://localhost/api/admin/pusher-metrics');
      const response = await pusherMetricsGet(req);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
    });

    it('should return 403 when admin role is not ADMIN or SUPER_ADMIN', async () => {
      (getAdminSession as any).mockResolvedValue({
        admin: { id: '1', role: 'LOGISTICS' },
      });

      const req = new Request('http://localhost/api/admin/pusher-metrics');
      const response = await pusherMetricsGet(req);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.success).toBe(false);
    });

    it('should return metrics for ADMIN role', async () => {
      (getAdminSession as any).mockResolvedValue({
        admin: { id: '1', role: 'ADMIN' },
      });
      (getPusherMetrics as any).mockResolvedValue({
        date: '2024-01-01',
        totalEvents: 1000,
        eventsByType: { 'qr:scanned': 500, 'scanner:presence': 300 },
        lastReset: '2024-01-01T00:00:00Z',
      });
      (checkPusherQuota as any).mockResolvedValue({
        ok: true,
        usage: 1000,
        remaining: 199000,
        limit: 200000,
        percentUsed: 0.5,
        warningLevel: 'normal',
      });

      const req = new Request('http://localhost/api/admin/pusher-metrics');
      const response = await pusherMetricsGet(req);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.totalEvents).toBe(1000);
      expect(data.data.quota.usage).toBe(1000);
    });
  });
});
