import Pusher from 'pusher';

// Server-side Pusher (lazy initializer)
let _pusherServer: Pusher | null = null;

export const getPusherServer = () => {
  if (!_pusherServer) {
    const appId = process.env.PUSHER_APP_ID;
    const key = process.env.NEXT_PUBLIC_PUSHER_KEY;
    const secret = process.env.PUSHER_SECRET;
    const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER;

    if (!appId || !key || !secret || !cluster) {
      console.warn('Pusher server variables are missing. Triggering events will fail.');
      return null;
    }

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
      const PusherClient = require('pusher-js');
      
      console.log('[Pusher] Initializing client with key:', key.substring(0, 5) + '...', 'Cluster:', cluster);
      pusherClient = new PusherClient(key, {
        cluster: cluster,
        forceTLS: true,
        enabledTransports: ['ws', 'wss'],
      });
    } catch (err) {
      console.error('[Pusher] Client initialization failed:', err);
      return null;
    }
  }
  return pusherClient;
};
