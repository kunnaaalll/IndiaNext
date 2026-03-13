import Pusher from 'pusher';
import PusherClient from 'pusher-js';

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

let pusherClient: PusherClient | null = null;

export const getPusherClient = () => {
  if (!pusherClient) {
    const key = process.env.NEXT_PUBLIC_PUSHER_KEY;
    const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER;

    if (!key || !cluster) {
      console.warn('Pusher environment variables are missing. Real-time features will not work.');
      return null;
    }

    pusherClient = new PusherClient(key, {
      cluster: cluster,
    });
  }
  return pusherClient;
};
